import { materialRoutes } from './material-contracts.js';
import { MaterialService } from './materials.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { missionInput, type Body, type MissionInput, type Operation, type Paging } from './contracts.js';
import type { Config } from './config.js';
import { fail, missing } from './errors.js';
import { serial, type Tx } from './database.js';
import { budget, digest } from './rate-limit.js';
import { AiService, type DraftProvider } from './ai.js';
import { getProfile, updateProfile } from './profiles.js';
import { LearningService, learnerPlans, allowedFormats } from './learning.js';
import { verifySupportAudio } from './support-audio.js';
import { StrategyService } from './strategies.js';
import { copyMaterialFiles } from './material-files.js';
import { MATERIAL_DRAFT_RETENTION_MS, publishedMaterialExpiry } from './material-limits.js';

const versionInclude = { steps: { orderBy: { position: 'asc' as const } }, materials: true };
const missionInclude = { draftVersion: { include: versionInclude }, publishedVersion: { include: versionInclude } };
const submissionInclude = { feedback: { orderBy: { createdAt: 'asc' as const } },
  updatedBy: { select: { name: true } },
  validations: { orderBy: [{ stepId: 'asc' as const }, { validatedAt: 'asc' as const }], include: { user: { select: { name: true } } } },
  version: { include: { steps: { orderBy: { position: 'asc' as const }, include: { deadlineExtensions: true } } } } };
type MissionRow = Prisma.MissionGetPayload<{ include: typeof missionInclude }>;

export function missionView(row: MissionRow, teacher: boolean) {
  const version = (v: MissionRow['draftVersion']) => v && ({ id: v.id, missionId: v.missionId, title: v.title, workMode: v.workMode,
    studentsCanFormTeams: v.studentsCanFormTeams,
    description: v.description, objectives: v.objectives, criteria: v.criteria, source: v.source, dueAt: v.dueAt,
    createdAt: v.createdAt, steps: v.steps.map(s => ({ id: s.id, position: s.position, title: s.title, instructions: s.instructions, example: s.example,
      ...(s.interaction && typeof s.interaction === 'object' && !Array.isArray(s.interaction) ? { interaction: teacher ? s.interaction : Object.fromEntries(Object.entries(s.interaction).filter(([key]) => key !== 'answerKey')) } : {}),
      dueAt: s.dueAt, deadlineExtended: false, maxPoints: s.maxPoints })),
    materials: v.materials.map(m => ({ id: m.id, title: m.title, text: m.text, hasFile: Boolean(m.storagePath) })) });
  return { id: row.id, classroomId: row.classroomId, status: row.status,
    draftVersion: teacher ? version(row.draftVersion) : null, publishedVersion: version(row.publishedVersion) };
}
export function submissionView(s: Prisma.SubmissionGetPayload<{ include: typeof submissionInclude }>, teacher = false) {
  const completions = s.stepCompletedAt && typeof s.stepCompletedAt === 'object' && !Array.isArray(s.stepCompletedAt)
    ? s.stepCompletedAt as Record<string, string> : {};
  const stepResponses = (s.stepResponses && typeof s.stepResponses === 'object' && !Array.isArray(s.stepResponses) ? s.stepResponses : {}) as Record<string, string>;
  const stepRevisions = (s.stepRevisions && typeof s.stepRevisions === 'object' && !Array.isArray(s.stepRevisions) ? s.stepRevisions : {}) as Record<string, number>;
  const submittedStepIds = Array.isArray(s.submittedStepIds) ? s.submittedStepIds.filter((stepId): stepId is string => typeof stepId === 'string') : [];
  const visibleResponses = teacher && s.status === 'partial' ? Object.fromEntries(Object.entries(stepResponses).filter(([stepId]) => submittedStepIds.includes(stepId))) : stepResponses;
  const partialTeacherView = teacher && s.status === 'partial';
  return { id: s.id, versionId: s.versionId, userId: s.userId, updatedById: s.updatedById, updatedByName: s.updatedBy?.name ?? null, groupId: s.groupId, status: s.status, content: partialTeacherView ? '' : s.content, stepResponses: visibleResponses, stepRevisions,
    validations: s.validations.map(validation => ({ stepId: validation.stepId, userId: validation.userId, userName: validation.user.name, validatedAt: validation.validatedAt,
      current: validation.contentHash === (stepResponses[validation.stepId] ?? (s.currentStepId === validation.stepId ? s.content : '')) })), hasAudio: partialTeacherView ? false : s.hasAudio, hasTextFile: partialTeacherView ? false : s.hasTextFile,
    submittedStepIds, submittedStepAt: s.submittedStepAt,
    completedStepIds: s.completedStepIds, currentStepId: s.currentStepId, revision: s.revision,
    submittedAt: s.submittedAt, updatedAt: s.updatedAt, attempt: s.attempt, revisionRequested: s.revisionRequested,
    gradingSteps: s.version.steps.map(step => {
      const extension = step.deadlineExtensions.find(item => item.studentId === s.userId);
      const dueAt = extension?.dueAt ?? step.dueAt;
      const completedAt = completions[step.id] ?? null;
      return { id: step.id, title: step.title, maxPoints: step.maxPoints, dueAt, baseDueAt: step.dueAt, deadlineExtended: Boolean(extension), completedAt,
        late: Boolean(completedAt && dueAt && new Date(completedAt) > dueAt) };
    }),
    feedback: s.feedback.map(f => ({ id: f.id, content: f.content, createdAt: f.createdAt,
      scores: f.scores, totalPoints: f.totalPoints })) };
}
export const barrierView = (b: {id: string; stepId: string; description: string; sharedWithTeacher: boolean; response: string | null; createdAt: Date}) =>
  ({ id: b.id, stepId: b.stepId, description: b.description, sharedWithTeacher: b.sharedWithTeacher, response: b.response, createdAt: b.createdAt });

export function isInstructorRole(role: string) { return role === 'teacher' || role === 'monitor'; }
const instructorRoles = ['teacher', 'monitor'] as const;
const classroomRoles = ['student', ...instructorRoles] as const;
export async function membership(tx: Tx, userId: string, classroomId: string, teacher = false) {
  const member = await tx.membership.findFirst({ where: { userId, classroomId, active: true,
    role: teacher ? { in: [...instructorRoles] } : { in: [...classroomRoles] } } });
  return member ?? missing();
}
export async function scopedMission(tx: Tx, userId: string, id: string, teacher = false, requireActiveClassroom = false) {
  const row = await tx.mission.findFirst({ where: { id, classroom: {
    memberships: { some: { userId, active: true, role: teacher ? { in: [...instructorRoles] } : { in: [...classroomRoles] } } },
    ...(requireActiveClassroom ? { archivedAt: null } : {}),
  } }, include: missionInclude });
  if (!row) return missing();
  const member = await membership(tx, userId, row.classroomId, teacher);
  if (member.role === 'student' && (await tx.classroom.findUnique({ where: { id: row.classroomId }, select: { archivedAt: true } }))?.archivedAt) return missing();
  if (member.role === 'student' && row.status !== 'published') return missing();
  return { row, member };
}
export async function createVersion(tx: Tx, missionId: string, input: MissionInput, source = 'manual') {
  return tx.missionVersion.create({ data: { missionId, title: input.title, description: input.description, workMode: input.workMode ?? 'individual',
    studentsCanFormTeams: input.workMode !== 'individual' && input.studentsCanFormTeams === true,
    objectives: input.objectives, criteria: input.criteria, dueAt: input.dueAt ? new Date(input.dueAt) : null, source,
    steps: { create: input.steps.map((s, position) => ({ title: s.title, instructions: s.instructions, example: s.example,
      ...(s.interaction ? { interaction: s.interaction } : {}),
      dueAt: s.dueAt ? new Date(s.dueAt) : null, maxPoints: s.maxPoints ?? null, position: position + 1 })) }, materials: { create: input.materials } }, include: versionInclude });
}
function pagination<T extends {id: string}>(rows: T[], limit: number) {
  const hasNext = rows.length > limit;
  const items = rows.slice(0, limit);
  return { items, nextCursor: hasNext ? items.at(-1)!.id : null };
}
const pageArgs = (p: Paging) => ({ take: p.limit + 1, orderBy: { id: 'asc' as const }, ...(p.cursor ? { where: { id: { gt: p.cursor } } } : {}) });
const after = (p: Paging) => p.cursor ? { id: { gt: p.cursor } } : {};
function gradePeriodView(period: { id: string; classroomId: string; name: string; formula: string; startsAt: Date | null; endsAt: Date | null; assessments: { id: string; missionId: string; weight: number; mission: { draftVersion: { title: string } | null; publishedVersion: { title: string } | null } }[] }) {
  return { id: period.id, classroomId: period.classroomId, name: period.name, formula: period.formula, startsAt: period.startsAt, endsAt: period.endsAt,
    assessments: period.assessments.map(a => ({ id: a.id, missionId: a.missionId, title: a.mission.publishedVersion?.title ?? a.mission.draftVersion?.title ?? 'Atividade', weight: a.weight })) };
}

export class ProductService {
  readonly ai: AiService;
  constructor(readonly db: PrismaClient, readonly config: Config, provider?: DraftProvider) { this.ai = new AiService(db, config, provider); }

  async execute(op: Operation, userId: string, p: Record<string, string>, body: unknown, query: unknown): Promise<unknown> {
    if (op in materialRoutes) return new MaterialService(this.db, this.config).execute(op, userId, p, body, query);
    const id = p.id;
    const paging = query as Paging;
    if (op === 'health') return { status: 'ok', service: 'travessia-api', stage: 'mvp' };
    if (['strategyCatalog', 'strategyRecipients', 'strategyPlans', 'createStrategyPlan', 'updateStrategyPlan', 'removeStrategyPlan', 'missionSupports', 'supportAudio'].includes(op))
      return new StrategyService(this.db).execute(op, userId, p, body, query);
    if (['learningOptions', 'learningNeeds', 'updateLearningNeeds', 'needsSharing', 'updateNeedsSharing', 'sharedLearningNeeds', 'adaptationPlans', 'createAdaptation', 'updateAdaptation', 'removeAdaptation', 'learnerAdaptations'].includes(op)) return new LearningService(this.db).execute(op, userId, p, body, query);
    if (op === 'me') {
      const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { studentProfile: true, preferences: true } });
      return { id: user.id, name: user.name, email: user.email, course: user.studentProfile?.course ?? null, demo: this.config.demo,
        preferences: this.preferenceView(user.preferences) };
    }
    if (op === 'profile') return getProfile(this.db, userId);
    if (op === 'updateProfile') return updateProfile(this.db, userId, body as Body<'updateProfile'>);
    if (op === 'preferences') {
      const data = body as Body<'preferences'>;
      return this.preferenceView(await this.db.readingPreferences.upsert({ where: { userId }, create: { userId, ...data }, update: data }));
    }
    if (op === 'classrooms') {
      const view = (query as { view?: 'active' | 'archived' }).view ?? 'active';
      const rows = await this.db.classroom.findMany({ ...pageArgs(paging), where: { ...after(paging),
        ...(view === 'archived' ? { ownerId: userId, archivedAt: { not: null } } : { archivedAt: null }),
        memberships: { some: { userId, active: true } } },
        include: { memberships: { where: { userId, active: true }, select: { role: true } } } });
      return pagination(rows.map(c => ({ id: c.id, name: c.name, shift: c.shift, role: c.memberships[0].role,
        archivedAt: c.archivedAt, ownerId: c.ownerId, isOwner: c.ownerId === userId })), paging.limit);
    }
    if (op === 'createClassroom') {
      await budget(this.db, `create-classroom:${userId}`, 10, 3600);
      const data = body as Body<'createClassroom'>;
      const c = await this.db.classroom.create({ data: { name: data.name, owner: { connect: { id: userId } }, memberships: { create: { userId, role: 'teacher' } } } });
      return { id: c.id, name: c.name, role: 'teacher' };
    }
    if (op === 'archiveClassroom') {
      return serial(this.db, async tx => {
        const classroom = await tx.classroom.findFirst({ where: { id, ownerId: userId,
          memberships: { some: { userId, active: true, role: 'teacher' } } } });
        if (!classroom) return missing();
        if (classroom.archivedAt) return { archived: true as const, archivedAt: classroom.archivedAt };
        const archivedAt = new Date();
        await tx.classroom.update({ where: { id }, data: { archivedAt } });
        await tx.invitation.updateMany({ where: { classroomId: id, revokedAt: null }, data: { revokedAt: archivedAt } });
        await tx.auditEvent.create({ data: { actorId: userId, action: 'classroom.archive', resourceId: id } });
        return { archived: true as const, archivedAt };
      });
    }
    if (op === 'gradePeriods' || op === 'createGradePeriod') {
      const member = await membership(this.db, userId, id, true);
      if (!isInstructorRole(member.role)) return missing();
      if (op === 'gradePeriods') {
        const rows = await this.db.gradePeriod.findMany({
          where: { classroomId: id },
          include: { assessments: { include: { mission: { include: { draftVersion: { select: { title: true } }, publishedVersion: { select: { title: true } } } } } } },
          orderBy: { createdAt: 'asc' },
        });
        return { items: rows.map(gradePeriodView) };
      }
      const data = body as Body<'createGradePeriod'>;
      const period = await this.db.gradePeriod.create({ data: { classroomId: id, name: data.name, startsAt: data.startsAt ? new Date(data.startsAt) : null, endsAt: data.endsAt ? new Date(data.endsAt) : null }, include: { assessments: { include: { mission: { include: { draftVersion: { select: { title: true } }, publishedVersion: { select: { title: true } } } } } } } });
      await this.db.auditEvent.create({ data: { actorId: userId, action: 'grade-period.create', resourceId: period.id } });
      return gradePeriodView(period);
    }
    if (op === 'addGradeAssessment') {
      const period = await this.db.gradePeriod.findUnique({ where: { id }, include: { assessments: true } });
      if (!period) return missing();
      const member = await membership(this.db, userId, period.classroomId, true);
      if (!isInstructorRole(member.role)) return missing();
      const data = body as Body<'addGradeAssessment'>;
      const mission = await this.db.mission.findFirst({ where: { id: data.missionId, classroomId: period.classroomId }, include: { draftVersion: true, publishedVersion: true } });
      if (!mission) return missing();
      const assessment = await this.db.gradeAssessment.create({ data: { periodId: id, missionId: data.missionId, weight: data.weight }, include: { mission: { include: { draftVersion: { select: { title: true } }, publishedVersion: { select: { title: true } } } } } });
      await this.db.auditEvent.create({ data: { actorId: userId, action: 'grade-assessment.create', resourceId: assessment.id } });
      return { id: assessment.id, missionId: assessment.missionId, title: assessment.mission.publishedVersion?.title ?? assessment.mission.draftVersion?.title ?? 'Atividade', weight: assessment.weight };
    }
    if (op === 'gradebook') {
      const period = await this.db.gradePeriod.findUnique({ where: { id }, include: { assessments: { include: { mission: { include: { draftVersion: { select: { title: true } }, publishedVersion: { select: { title: true } } } } } } } });
      if (!period) return missing();
      const member = await membership(this.db, userId, period.classroomId, true);
      if (!isInstructorRole(member.role)) return missing();
      const students = await this.db.membership.findMany({ where: { classroomId: period.classroomId, role: 'student', active: true }, include: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: 'asc' } } });
      const submissions = await this.db.submission.findMany({ where: { status: 'reviewed', version: { missionId: { in: period.assessments.map(a => a.missionId) } } }, include: { feedback: { orderBy: { createdAt: 'desc' }, take: 1 }, version: { include: { steps: { select: { maxPoints: true } } } }, group: { include: { members: true } } } });
      const valueFor = (assessmentId: string, missionId: string, studentId: string) => {
        const row = submissions.find(s => s.version.missionId === missionId && (s.userId === studentId || s.group?.members.some(m => m.userId === studentId)));
        const feedback = row?.feedback[0];
        if (!feedback || feedback.totalPoints === null || feedback.totalPoints === undefined) return null;
        const max = row.version.steps.reduce((sum, step) => sum + (step.maxPoints ?? 0), 0);
        return max > 0 ? Math.round((feedback.totalPoints / max) * 10 * 100) / 100 : null;
      };
      return { period: gradePeriodView(period), students: students.map(({ user }) => {
        const assessments = period.assessments.map(a => ({ assessmentId: a.id, missionId: a.missionId, title: a.mission.publishedVersion?.title ?? a.mission.draftVersion?.title ?? 'Atividade', value: valueFor(a.id, a.missionId, user.id), weight: a.weight }));
        const graded = assessments.filter(a => a.value !== null);
        const totalWeight = graded.reduce((sum, a) => sum + a.weight, 0);
        const average = totalWeight ? Math.round(graded.reduce((sum, a) => sum + (a.value! * a.weight), 0) / totalWeight * 100) / 100 : null;
        return { studentId: user.id, name: user.name, assessments, average };
      }) };
    }
    if (op === 'acceptInvite') {
      await budget(this.db, `accept-invite:${userId}`, 20, 3600);
      await budget(this.db, 'accept-invite-global', 300, 60);
      return serial(this.db, async tx => {
        const token=(body as Body<'acceptInvite'>).token;
        const invite = await tx.invitation.findUnique({ where: token.length===8 ? { codeHash: digest(token) } : { tokenHash: digest(token) } });
        if (!invite || invite.revokedAt || (!invite.reusable && invite.consumedAt) || invite.expiresAt <= new Date()) return fail(400, 'INVALID_INVITATION', 'Convite indisponível.');
        const old = await tx.membership.findUnique({ where: { userId_classroomId: { userId, classroomId: invite.classroomId } } });
        // A valid, teacher-issued monitor invitation may promote an active student in this classroom.
        // Revoked memberships and other existing roles cannot regain or change access this way.
        const promoteStudentToMonitor = !!old && old.active && old.role === 'student' && invite.role === 'monitor';
        if (old && !promoteStudentToMonitor) return fail(409, 'MEMBERSHIP_EXISTS', 'Sua conta já possui um vínculo com essa turma.');
        const changed = await tx.invitation.updateMany({ where: { id: invite.id, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: invite.reusable ? { expiresAt: invite.expiresAt } : { consumedAt: new Date(), consumedBy: userId } });
        if (!changed.count) return fail(400, 'INVALID_INVITATION', 'Convite indisponível.');
        if (promoteStudentToMonitor) await tx.membership.update({ where: { userId_classroomId: { userId, classroomId: invite.classroomId } }, data: { role: 'monitor' } });
        else await tx.membership.create({ data: { userId, classroomId: invite.classroomId, role: invite.role } });
        const c = await tx.classroom.findUniqueOrThrow({ where: { id: invite.classroomId } });
        return { id: c.id, name: c.name, role: invite.role };
      });
    }
    if (op === 'leaveClassroom') {
      return serial(this.db, async tx => {
        const member = await tx.membership.findFirst({ where: { userId, classroomId: id, active: true, role: { in: ['student', 'monitor'] } } });
        if (!member) return missing();
        const changed = await tx.membership.updateMany({ where: { id: member.id, userId, classroomId: id, active: true }, data: { active: false } });
        if (!changed.count) return missing();
        await tx.auditEvent.create({ data: { actorId: userId, resourceId: member.id, action: 'membership.leave' } });
        return { left: true };
      });
    }
    if (op === 'generateSupports') return this.ai.generateSupports(userId, id, body as Body<'generateSupports'>);
    if (op === 'generateFeedbackDraft') return this.ai.generateFeedbackDraft(userId, id, body as Body<'generateFeedbackDraft'>);
    if (op === 'generate') return this.ai.generate(userId, id, body as Body<'generate'>);
    if (op === 'generation') return this.ai.get(userId, id);
    if (op === 'download') return this.download(userId, id);

    return serial(this.db, async tx => {
      if (['members', 'revokeMember', 'invite', 'invitations', 'revokeInvite', 'missions', 'createMission', 'barriers', 'upload'].includes(op)) {
        const member = await membership(tx, userId, id, ['members', 'revokeMember', 'invite', 'invitations', 'revokeInvite', 'upload'].includes(op));
        if (op === 'members') {
          const rows = await tx.membership.findMany({ ...pageArgs(paging), where: { ...after(paging), classroomId: id }, include: { user: { select: { name: true } } } });
          return pagination(rows.map(m => ({ id: m.id, name: m.user.name, role: m.role, active: m.active })), paging.limit);
        }
        if (op === 'revokeMember') {
          const target = await tx.membership.findFirst({ where: { id: p.memberId, classroomId: id, role: { in: ['student', 'monitor'] } } });
          if (!target) return missing();
          await tx.membership.update({ where: { id: target.id }, data: { active: false } });
          await tx.auditEvent.create({ data: { actorId: userId, resourceId: target.id, action: 'membership.revoke' } });
          return { revoked: true };
        }
        if (op === 'invitations') {
          const rows = await tx.invitation.findMany({ ...pageArgs(paging), where: { ...after(paging), classroomId: id, revokedAt: null, consumedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, role: true, reusable: true, createdAt: true, expiresAt: true } });
          return pagination(rows, paging.limit);
        }
        if (op === 'invite') {
          // Count within the same serializable transaction to bound issuance across instances.
          if (await tx.invitation.count({ where: { classroomId: id, createdAt: { gt: new Date(Date.now() - 3600000) } } }) >= 30) return fail(429, 'RATE_LIMITED', 'Limite de convites atingido.');
          const token = randomBytes(32).toString('hex');
          const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          const code=Array.from(randomBytes(8),byte=>alphabet[byte & 31]).join('');
          const role=(body as Body<'invite'>).role??'student';
          if (role === 'monitor' && (body as Body<'invite'>).reusable) return fail(400, 'INVALID_INVITATION', 'Convite de monitor deve ser de uso único.');
          const reusable=role === 'student' && ((body as Body<'invite'>).reusable??false);
          const invite = await tx.invitation.create({ data: { classroomId: id, tokenHash: digest(token), codeHash: digest(code), role, reusable, expiresAt: new Date(Date.now() + 7 * 86400000) } });
          return { id: invite.id, token, code, role, reusable, createdAt: invite.createdAt, expiresAt: invite.expiresAt };
        }
        if (op === 'revokeInvite') {
          const result = await tx.invitation.updateMany({ where: { id: p.invitationId, classroomId: id }, data: { revokedAt: new Date() } });
          if (!result.count) return missing();
          return { revoked: true };
        }
        if (op === 'missions') {
          const rows = await tx.mission.findMany({ ...pageArgs(paging), where: { ...after(paging), classroomId: id, ...(member.role === 'student' ? { status: 'published' } : {}) }, include: missionInclude });
          return pagination(rows.map(m => missionView(m, member.role !== 'student')), paging.limit);
        }
        if (op === 'createMission') {
          if (member.role === 'student') return missing();
          const m = await tx.mission.create({ data: { classroomId: id } });
          const version = await createVersion(tx, m.id, body as MissionInput);
          const row = await tx.mission.update({ where: { id: m.id }, data: { draftVersionId: version.id }, include: missionInclude });
          return missionView(row, true);
        }
        if (op === 'upload') return fail(503, 'UPLOAD_DISABLED', 'Envio de arquivos indisponível. Use material textual.');
        if (op === 'barriers') {
          const rows = await tx.barrierReport.findMany({ ...pageArgs(paging), where: { ...after(paging), step: { version: { mission: { classroomId: id } } },
            OR: [{ userId }, ...(isInstructorRole(member.role) ? [{ sharedWithTeacher: true }] : [])] } });
          return pagination(rows.map(barrierView), paging.limit);
        }
      }
      if (['mission', 'copyMission', 'editMission', 'publish', 'archive', 'deleteMission', 'saveSubmission', 'submissions', 'setStepDeadlineExtension', 'groups', 'createGroup', 'updateGroup', 'removeGroup', 'setParticipationMode'].includes(op)) {
        const instructorAction = ['copyMission', 'editMission', 'publish', 'archive', 'deleteMission', 'setStepDeadlineExtension', 'removeGroup', 'setParticipationMode'].includes(op);
        const mutation = ['copyMission', 'editMission', 'publish', 'archive', 'deleteMission', 'saveSubmission', 'setStepDeadlineExtension', 'createGroup', 'updateGroup', 'removeGroup', 'setParticipationMode'].includes(op);
        const { row, member } = await scopedMission(tx, userId, id, instructorAction, mutation);
        if (op === 'copyMission') {
          const targetClassroomId = (body as Body<'copyMission'>).targetClassroomId;
          if (member.role === 'student') return missing();
          if (targetClassroomId === row.classroomId) return fail(400, 'SAME_CLASSROOM', 'Escolha uma turma diferente da turma original.');
          const target = await tx.classroom.findFirst({ where: { id: targetClassroomId, archivedAt: null,
            memberships: { some: { userId, active: true, role: { in: [...instructorRoles] } } } }, select: { id: true } });
          if (!target) return missing();
          const sourceVersion = row.draftVersion ?? row.publishedVersion;
          if (!sourceVersion) return fail(409, 'MISSION_HAS_NO_VERSION', 'A atividade não tem conteúdo para copiar.');
          if (sourceVersion.steps.some(step => step.maxPoints === null || step.maxPoints < 1))
            return fail(409, 'SCORING_NOT_CONFIGURED', 'Configure de 1 a 100 pontos em cada etapa antes de copiar esta atividade.');
          const copied = await tx.mission.create({ data: { classroomId: target.id } });
          const version = await createVersion(tx, copied.id, {
            title: sourceVersion.title, description: sourceVersion.description,
            objectives: sourceVersion.objectives as string[], criteria: sourceVersion.criteria as string[],
            workMode: sourceVersion.workMode as MissionInput['workMode'], studentsCanFormTeams: sourceVersion.studentsCanFormTeams, dueAt: null,
            steps: sourceVersion.steps.map(step => ({ title: step.title, instructions: step.instructions, example: step.example,
              ...(step.interaction ? { interaction: step.interaction as MissionInput['steps'][number]['interaction'] } : {}), dueAt: null, maxPoints: step.maxPoints! })),
            materials: sourceVersion.materials.map(material => ({ title: material.title, text: material.text })),
          }, 'manual');
          const files = await tx.materialSource.findMany({ where: { versionId: sourceVersion.id, status: 'ready', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' }, take: 30 });
          for (const source of files) {
            const sourceId = randomUUID();
            await tx.materialSource.create({ data: { id: sourceId, versionId: version.id, creatorId: userId, title: source.title, downloadAllowed: source.downloadAllowed,
              hash: source.hash, requestKey: randomUUID(), status: 'ready', pageCount: source.pageCount, pages: source.pages as Prisma.InputJsonValue,
              warnings: source.warnings as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + MATERIAL_DRAFT_RETENTION_MS) } });
            await copyMaterialFiles(source.id, sourceId);
          }
          const result = await tx.mission.update({ where: { id: copied.id }, data: { draftVersionId: version.id }, include: missionInclude });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'mission.copy', resourceId: copied.id } });
          return missionView(result, true);
        }
        if (op === 'deleteMission') {
          if (member.role !== 'teacher') return missing();
          const [submissions, barriers, files] = await Promise.all([
            tx.submission.count({ where: { version: { missionId: id } } }),
            tx.barrierReport.count({ where: { step: { version: { missionId: id } } } }),
            tx.material.count({ where: { version: { missionId: id }, storagePath: { not: null } } }),
          ]);
          if (submissions || barriers || files) return fail(409, 'MISSION_DELETE_BLOCKED', 'Esta atividade possui histórico ou arquivos. Use Arquivar atividade para preservá-los.');
          await tx.mission.delete({ where: { id } });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'mission.delete', resourceId: id } });
          return { deleted: true as const };
        }
        if (op === 'mission') {
          const view = missionView(row, member.role !== 'student');
          if (member.role !== 'student' || !view.publishedVersion) return view;
          const extensions = await tx.stepDeadlineExtension.findMany({ where: { studentId: userId, step: { versionId: view.publishedVersion.id } } });
          return { ...view, publishedVersion: { ...view.publishedVersion, steps: view.publishedVersion.steps.map(step => {
            const extension = extensions.find(item => item.stepId === step.id);
            return extension ? { ...step, dueAt: extension.dueAt, deadlineExtended: true } : step;
          }) } };
        }
        if (op === 'setStepDeadlineExtension') {
          if (!isInstructorRole(member.role) || !row.publishedVersion) return missing();
          const step = row.publishedVersion.steps.find(item => item.id === p.stepId);
          if (!step) return missing();
          if (!step.dueAt) return fail(409, 'STEP_HAS_NO_DEADLINE', 'Defina um prazo para a etapa antes de prorrogar.');
          const input = body as Body<'setStepDeadlineExtension'>;
          const student = await tx.membership.findFirst({ where: { classroomId: row.classroomId, userId: input.studentId, active: true, role: 'student' } });
          if (!student) return missing();
          if (input.dueAt === null) {
            await tx.stepDeadlineExtension.deleteMany({ where: { stepId: step.id, studentId: input.studentId } });
            return { stepId: step.id, studentId: input.studentId, dueAt: null };
          }
          const dueAt = new Date(input.dueAt);
          if (dueAt <= step.dueAt) return fail(400, 'INVALID_EXTENSION', 'A prorrogação precisa ser posterior ao prazo original.');
          const extension = await tx.stepDeadlineExtension.upsert({ where: { stepId_studentId: { stepId: step.id, studentId: input.studentId } },
            create: { stepId: step.id, studentId: input.studentId, teacherId: userId, dueAt }, update: { teacherId: userId, dueAt } });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'step.deadline-extension', resourceId: extension.id } });
          return { stepId: step.id, studentId: input.studentId, dueAt: extension.dueAt };
        }
        if (op === 'groups') {
          const relevant = member.role === 'student' ? row.publishedVersion : row.draftVersion ?? row.publishedVersion;
          if (relevant?.workMode === 'individual') return { items: [], participationMode: null };
          const groups = await tx.missionGroup.findMany({ where: { missionId: id, archivedAt: null, ...(member.role === 'student' ? { members: { some: { userId } } } : {}) }, include: { members: { select: { userId: true } }, _count: { select: { submissions: true } } }, orderBy: { name: 'asc' } });
          const participation = member.role === 'student' ? await tx.missionParticipation.findUnique({ where: { missionId_userId: { missionId: id, userId } }, select: { mode: true } }) : null;
          return { items: groups.map(g => ({ id: g.id, name: g.name, leaderId: g.leaderId, studentIds: g.members.map(m => m.userId), ...(isInstructorRole(member.role) ? { hasSubmissions: g._count.submissions > 0 } : {}), canAddMembers: member.role === 'student' && g.leaderId === userId && g.members.some(m => m.userId === userId) && row.status !== 'archived' && !!row.publishedVersion?.studentsCanFormTeams && g._count.submissions === 0 })),
            participationMode: participation?.mode === 'individual' ? 'individual' : participation ? 'group' : null };
        }
        if (op === 'createGroup') {
          if (row.status === 'archived') return missing();
          const studentForming = member.role === 'student';
          if (studentForming && (!row.publishedVersion?.studentsCanFormTeams || row.publishedVersion.workMode === 'individual')) return missing();
          if (!studentForming && !isInstructorRole(member.role)) return missing();
          if (!studentForming && row.draftVersion?.workMode === 'individual' && row.publishedVersion?.workMode === 'individual') return fail(409, 'INDIVIDUAL_ACTIVITY', 'Esta atividade é individual.');
          const data = body as Body<'createGroup'>;
          if (studentForming && (!data.studentIds.includes(userId) || (data.leaderId && data.leaderId !== userId))) return fail(400, 'GROUP_CREATOR_REQUIRED', 'Inclua você na equipe e escolha a si mesmo como líder.');
          if (studentForming && data.studentIds.length < 2) return fail(400, 'GROUP_SIZE_TOO_SMALL', 'Selecione pelo menos outra pessoa para formar uma equipe.');
          if (await tx.missionGroup.count({ where: { missionId: id, name: data.name, archivedAt: null } })) return fail(409, 'GROUP_NAME_EXISTS', 'Já existe uma equipe com este nome nesta atividade.');
          const students = await tx.membership.count({ where: { classroomId: row.classroomId, role: 'student', active: true, userId: { in: data.studentIds } } });
          if (students !== data.studentIds.length) return fail(400, 'INVALID_RECIPIENTS', 'Escolha alunos ativos desta turma.');
          if (data.leaderId && !data.studentIds.includes(data.leaderId)) return fail(400, 'INVALID_LEADER', 'O líder precisa pertencer à equipe.');
          const already = await tx.missionGroupMember.count({ where: { userId: { in: data.studentIds }, group: { missionId: id, archivedAt: null } } });
          if (already) return fail(409, 'GROUP_MEMBERSHIP_EXISTS', 'Um aluno já pertence a outra equipe desta atividade.');
          const group = await tx.missionGroup.create({ data: { missionId: id, name: data.name, leaderId: studentForming ? userId : data.leaderId ?? data.studentIds[0], members: { create: data.studentIds.map(userId => ({ userId })) } } });
          for (const studentId of data.studentIds) await tx.missionParticipation.upsert({
            where: { missionId_userId: { missionId: id, userId: studentId } },
            create: { missionId: id, userId: studentId, groupId: group.id, mode: 'group' },
            update: { groupId: group.id, mode: 'group', reason: null },
          });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'group.create', resourceId: group.id } });
          return { id: group.id, name: group.name, leaderId: group.leaderId, studentIds: data.studentIds, hasSubmissions: false, canAddMembers: studentForming && group.leaderId === userId };
        }
        if (op === 'updateGroup') {
          if ((!isInstructorRole(member.role) && member.role !== 'student') || row.status === 'archived') return missing();
          const data = body as Body<'updateGroup'>;
          const group = await tx.missionGroup.findFirst({ where: { id: p.groupId, missionId: id, archivedAt: null }, include: { members: true } });
          if (!group) return missing();
          const studentLeader = member.role === 'student' && group.leaderId === userId && group.members.some(item => item.userId === userId) && !!row.publishedVersion?.studentsCanFormTeams && row.publishedVersion.workMode !== 'individual';
          if (!isInstructorRole(member.role) && !studentLeader) return missing();
          if (data.leaderId && !data.studentIds.includes(data.leaderId)) return fail(400, 'INVALID_LEADER', 'O líder precisa pertencer à equipe.');
          const duplicateName = await tx.missionGroup.findFirst({ where: { missionId: id, name: data.name ?? group.name, id: { not: group.id }, archivedAt: null }, select: { id: true } });
          if (duplicateName) return fail(409, 'GROUP_NAME_EXISTS', 'Já existe uma equipe com este nome nesta atividade.');
          const oldStudentIds = group.members.map(item => item.userId).sort();
          const newStudentIds = [...data.studentIds].sort();
          const membershipChanged = oldStudentIds.length !== newStudentIds.length || oldStudentIds.some((studentId, index) => studentId !== newStudentIds[index]);
          if (studentLeader) {
            const addsOnly = oldStudentIds.every(studentId => newStudentIds.includes(studentId)) && newStudentIds.length > oldStudentIds.length;
            if (!addsOnly || data.name !== group.name || data.leaderId !== group.leaderId) return fail(403, 'GROUP_LEADER_ADD_ONLY', 'O líder pode adicionar integrantes. Para remover alguém ou mudar a equipe, peça autorização ao professor.');
          }
          const submissionCount = await tx.submission.count({ where: { groupId: group.id } });
          if (submissionCount && membershipChanged) return fail(409, 'GROUP_HAS_SUBMISSIONS', studentLeader ? 'Esta equipe já tem entregas. Peça autorização ao professor para alterar os integrantes.' : 'Esta equipe já tem entregas. Para preservar o acesso ao histórico, remova a equipe e crie outra com os novos integrantes.');
          const students = await tx.membership.count({ where: { classroomId: row.classroomId, role: 'student', active: true, userId: { in: data.studentIds } } });
          if (students !== data.studentIds.length) return fail(400, 'INVALID_RECIPIENTS', 'Escolha alunos ativos desta turma.');
          const occupied = await tx.missionGroupMember.count({ where: { userId: { in: data.studentIds }, group: { missionId: id, archivedAt: null, id: { not: group.id } } } });
          if (occupied) return fail(409, 'GROUP_MEMBERSHIP_EXISTS', 'Um aluno já pertence a outra equipe desta atividade.');
          if (membershipChanged) {
            await tx.missionGroupMember.deleteMany({ where: { groupId: group.id } });
            await tx.missionGroupMember.createMany({ data: data.studentIds.map(userId => ({ groupId: group.id, userId })) });
            await tx.missionParticipation.updateMany({ where: { missionId: id, groupId: group.id }, data: {
              groupId: null,
              mode: (row.draftVersion ?? row.publishedVersion)?.workMode === 'mixed' ? 'individual' : 'group',
            } });
            for (const studentId of data.studentIds) await tx.missionParticipation.upsert({
              where: { missionId_userId: { missionId: id, userId: studentId } },
              create: { missionId: id, userId: studentId, mode: 'group', groupId: group.id },
              update: { mode: 'group', groupId: group.id, reason: null },
            });
          }
          const changed = await tx.missionGroup.update({ where: { id: group.id }, data: { name: data.name ?? group.name, leaderId: data.leaderId ?? data.studentIds[0] }, include: { members: true } });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'group.update', resourceId: group.id } });
          return { id: changed.id, name: changed.name, leaderId: changed.leaderId, studentIds: changed.members.map(m => m.userId), hasSubmissions: submissionCount > 0, canAddMembers: studentLeader && submissionCount === 0 };
        }
        if (op === 'setParticipationMode') {
          if (!isInstructorRole(member.role) || row.status === 'archived') return missing();
          const studentId = p.studentId;
          const student = await tx.membership.findFirst({ where: { classroomId: row.classroomId, userId: studentId, role: 'student', active: true } });
          if (!student) return missing();
          const data = body as Body<'setParticipationMode'>;
          const group = await tx.missionGroup.findFirst({ where: { missionId: id, archivedAt: null, members: { some: { userId: studentId } } } });
          if (data.mode === 'group' && !group) return fail(409, 'GROUP_REQUIRED', 'Inclua o aluno em uma equipe antes de selecionar a entrega em grupo.');
          const saved = await tx.missionParticipation.upsert({ where: { missionId_userId: { missionId: id, userId: studentId } }, create: { missionId: id, userId: studentId, mode: data.mode, groupId: data.mode === 'group' ? group?.id : null, reason: data.reason ?? null }, update: { mode: data.mode, groupId: data.mode === 'group' ? group?.id : null, reason: data.reason ?? null } });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'group.participation-mode', resourceId: saved.id } });
          return { studentId, mode: saved.mode, groupId: saved.groupId, reason: saved.reason };
        }
        if (op === 'removeGroup') {
          if (!isInstructorRole(member.role) || row.status === 'archived') return missing();
          const group = await tx.missionGroup.findFirst({ where: { id: p.groupId, missionId: id, archivedAt: null } });
          if (!group) return missing();
          await tx.missionGroup.update({ where: { id: group.id }, data: { archivedAt: new Date() } });
          await tx.missionParticipation.updateMany({ where: { missionId: id, groupId: group.id }, data: {
            groupId: null,
            mode: (row.draftVersion ?? row.publishedVersion)?.workMode === 'mixed' ? 'individual' : 'group',
          } });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'group.remove', resourceId: group.id } });
          return { removed: true };
        }
        if (op === 'editMission') {
          if (member.role === 'student') return missing();
          const input = body as Body<'editMission'>;
          if (row.status === 'archived' || row.draftVersionId !== input.expectedDraftVersionId) return fail(409, 'VERSION_CONFLICT', 'A missão mudou. Recarregue antes de salvar.');
          const carryIds = input.carryForwardMaterialIds ?? [];
          if (new Set(carryIds).size !== carryIds.length || (carryIds.length && !row.publishedVersionId)) return fail(400, 'INVALID_MATERIALS', 'Escolha PDFs válidos da versão publicada.');
          const carry = carryIds.length ? await tx.materialSource.findMany({ where: { id: { in: carryIds }, versionId: row.publishedVersionId!, status: 'ready', expiresAt: { gt: new Date() } } }) : [];
          if (carry.length !== carryIds.length) return fail(400, 'INVALID_MATERIALS', 'Escolha somente PDFs verificados da atividade publicada.');
          const { carryForwardMaterialIds: _carryForwardMaterialIds, ...versionInput } = input;
          const version = await createVersion(tx, row.id, versionInput);
          for (const source of carry) {
            const sourceId = randomUUID();
            await tx.materialSource.create({ data: { id: sourceId, versionId: version.id, creatorId: userId, title: source.title, downloadAllowed: source.downloadAllowed,
              hash: source.hash, requestKey: randomUUID(), status: 'ready', pageCount: source.pageCount, pages: source.pages as Prisma.InputJsonValue,
              warnings: source.warnings as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + MATERIAL_DRAFT_RETENTION_MS) } });
            await copyMaterialFiles(source.id, sourceId);
          }
          const changed = await tx.mission.update({ where: { id }, data: { draftVersionId: version.id }, include: missionInclude });
          return missionView(changed, true);
        }
        if (op === 'publish') {
          const input = body as Body<'publish'>;
          if (row.status === 'published' && row.publishedVersionId === input.versionId && !row.draftVersionId) return missionView(row, true);
          if (row.status === 'archived' || row.draftVersionId !== input.versionId || !row.draftVersion) return fail(409, 'VERSION_CONFLICT', 'Selecione o rascunho atual para revisão.');
          const v = row.draftVersion;
          missionInput.parse({ title: v.title, description: v.description, objectives: v.objectives, criteria: v.criteria,
            dueAt: v.dueAt?.toISOString() ?? null, workMode: v.workMode,
            steps: v.steps.map(s => ({ title: s.title, instructions: s.instructions, example: s.example,
              ...(s.interaction ? { interaction: s.interaction as MissionInput['steps'][number]['interaction'] } : {}),
              dueAt: s.dueAt?.toISOString() ?? null, maxPoints: s.maxPoints })),
            materials: v.materials.map(m => ({ title: m.title, text: m.text })) });
          const changed = await tx.mission.update({ where: { id }, data: { status: 'published', publishedVersionId: input.versionId, draftVersionId: null }, include: missionInclude });
          const keepUntil = publishedMaterialExpiry();
          await tx.materialSource.updateMany({ where: { versionId: v.id, status: 'ready' }, data: { expiresAt: keepUntil } });
          await tx.materialAdaptation.updateMany({ where: { versionId: v.id, status: 'released' }, data: { expiresAt: keepUntil } });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'mission.publish', resourceId: id } });
          return missionView(changed, true);
        }
        if (op === 'archive') return missionView(await tx.mission.update({ where: { id }, data: { status: 'archived' }, include: missionInclude }), true);
        if (op === 'saveSubmission') {
          if (member.role !== 'student' || !row.publishedVersion) return missing();
          const input = body as Body<'saveSubmission'>;
          const version = row.publishedVersion;
          if (input.versionId !== version.id) return fail(409, 'VERSION_CONFLICT', 'Uma nova versão foi publicada. Recarregue a missão.');
          const stepIds = new Set(version.steps.map(s => s.id));
          if (!stepIds.has(input.currentStepId) || input.completedStepIds.some(s => !stepIds.has(s)) || new Set(input.completedStepIds).size !== input.completedStepIds.length) return fail(400, 'INVALID_PROGRESS', 'Etapas inválidas.');
          const participation = await tx.missionParticipation.findUnique({ where: { missionId_userId: { missionId: row.id, userId } } });
          const requiresGroup = (version.workMode === 'group' && participation?.mode !== 'individual') || (version.workMode === 'mixed' && participation?.mode === 'group');
          const group = requiresGroup
            ? await tx.missionGroup.findFirst({ where: { id: participation?.groupId ?? undefined, missionId: row.id, archivedAt: null, members: { some: { userId } } } })
            : null;
          if (requiresGroup && !group) return fail(409, 'GROUP_REQUIRED', 'Peça ao professor para incluir você em uma equipe desta atividade.');
          const old = await tx.submission.findFirst({ where: { versionId: version.id, ...(group ? { groupId: group.id } : { userId, groupId: null }) }, orderBy: { attempt: 'desc' } });
          const existingResponses = old?.stepResponses && typeof old.stepResponses === 'object' && !Array.isArray(old.stepResponses) ? old.stepResponses as Record<string, string> : {};
          const existingStepRevisions = old?.stepRevisions && typeof old.stepRevisions === 'object' && !Array.isArray(old.stepRevisions) ? old.stepRevisions as Record<string, number> : {};
          if (input.stepId && !stepIds.has(input.stepId)) return fail(400, 'INVALID_STEP_RESPONSES', 'Resposta vinculada a uma etapa inválida.');
          const stepResponses = input.stepId ? { ...existingResponses, ...(input.stepResponses ?? {}), [input.stepId]: input.content }
            : input.stepResponses ? { ...existingResponses, ...input.stepResponses } : existingResponses;
          const alreadySubmitted = Array.isArray(old?.submittedStepIds) ? old.submittedStepIds.filter((value): value is string => typeof value === 'string') : [];
          if (old?.status === 'partial' && alreadySubmitted.some(stepId => existingResponses[stepId] !== stepResponses[stepId]))
            return fail(409, 'SUBMITTED_STEP_LOCKED', 'Uma atividade já enviada ao professor não pode ser alterada. Continue pelas atividades ainda abertas.');
          const safeStepMerge = Boolean(old && input.stepId && input.status === 'draft' && old.status === 'draft' && input.expectedRevision < old.revision &&
            (existingStepRevisions[input.stepId!] ?? 0) <= input.expectedRevision);
          if ((old?.revision ?? 0) !== input.expectedRevision && !safeStepMerge) {
            if (old && input.audio === undefined && input.textFile === undefined && old.content === input.content && JSON.stringify(old.stepResponses) === JSON.stringify(stepResponses) && old.status === input.status && old.currentStepId === input.currentStepId && JSON.stringify(old.completedStepIds) === JSON.stringify(input.completedStepIds)) return submissionView(await tx.submission.findUniqueOrThrow({ where: { id: old.id }, include: submissionInclude }));
            return fail(409, 'REVISION_CONFLICT', 'A entrega mudou. Recarregue antes de salvar.');
          }
          const retry = old?.status === 'reviewed' && old.revisionRequested;
          if (old && !['draft', 'partial'].includes(old.status) && !retry) return fail(409, 'SUBMISSION_LOCKED', 'Entrega enviada preservada para revisão.');
          const audio = input.audio === undefined ? (retry ? null : old?.audio) ?? null : input.audio === null ? null : verifySupportAudio(input.audio);
          const textFile = input.textFile === undefined ? (retry ? null : old?.textFile) ?? null : input.textFile?.text ?? null;
          if (textFile !== null && (Buffer.byteLength(textFile, 'utf8') > 32768 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(textFile))) return fail(400, 'INVALID_TEXT_FILE', 'Use arquivo de texto UTF-8, até 32 KiB, sem conteúdo binário.');
          const formats = allowedFormats(await learnerPlans(tx, version.id, userId));
          if ((audio && !formats.includes('audio')) || (textFile !== null && !formats.includes('text_file'))) return fail(409, 'FORMAT_NOT_ALLOWED', 'O professor não liberou este formato. Preserve sua resposta e consulte os formatos atuais.');
          if (input.status === 'submitted' && !input.content.trim() && !Object.values(stepResponses).some(response => response.trim()) && !audio && !textFile?.trim()) return fail(400, 'EMPTY_SUBMISSION', 'Inclua sua atividade antes de enviar.');
          const staleStepWrite = Boolean(old && input.stepId && input.expectedRevision < old.revision);
          const existingCompletedStepIds = Array.isArray(old?.completedStepIds)
            ? old.completedStepIds.filter((stepId): stepId is string => typeof stepId === 'string') : [];
          const completedAt: Record<string, string> = retry ? {} : old?.stepCompletedAt && typeof old.stepCompletedAt === 'object' && !Array.isArray(old.stepCompletedAt)
            ? { ...(old.stepCompletedAt as Record<string, string>) } : {};
          if (!staleStepWrite) for (const completedId of input.completedStepIds) if (!completedAt[completedId]) completedAt[completedId] = new Date().toISOString();
          for (const [stepId, response] of Object.entries(stepResponses)) if (!stepIds.has(stepId) || typeof response !== 'string' || response.length > 12000) return fail(400, 'INVALID_STEP_RESPONSES', 'Respostas por etapa inválidas.');
          const requestedStepIds = input.submitStepIds ?? [];
          if (requestedStepIds.some(stepId => !stepIds.has(stepId))) return fail(400, 'INVALID_PROGRESS', 'Atividade parcial inválida.');
          if (requestedStepIds.length && !group) return fail(400, 'PARTIAL_GROUP_ONLY', 'Envio parcial está disponível para atividades em equipe.');
          let submittedStepIds = Array.isArray(old?.submittedStepIds) ? old.submittedStepIds.filter((stepId): stepId is string => typeof stepId === 'string') : [];
          const submittedStepAt: Record<string, string> = old?.submittedStepAt && typeof old.submittedStepAt === 'object' && !Array.isArray(old.submittedStepAt) ? { ...(old.submittedStepAt as Record<string, string>) } : {};
          for (const stepId of new Set([...Object.keys(existingResponses), ...Object.keys(stepResponses)])) if (existingResponses[stepId] !== stepResponses[stepId]) {
            submittedStepIds = submittedStepIds.filter(value => value !== stepId); delete submittedStepAt[stepId];
          }
          if ((input.status === 'submitted' || requestedStepIds.length) && group) {
            if (group.leaderId !== userId) return fail(403, 'GROUP_LEADER_REQUIRED', 'Somente o líder da equipe pode enviar a atividade.');
            const members = await tx.missionGroupMember.findMany({ where: { groupId: group.id }, select: { userId: true } });
            const validations = old ? await tx.submissionStepValidation.findMany({ where: { submissionId: old.id, userId: { in: members.map(item => item.userId) }, stepId: { in: [...stepIds] } } }) : [];
            const candidates = requestedStepIds.length ? requestedStepIds : version.steps.map(step => step.id);
            const complete = candidates.every(stepId => {
              const step = version.steps.find(item => item.id === stepId)!;
              const response = stepResponses[step.id] ?? (old?.currentStepId === step.id ? old.content : '');
              if (!response.trim()) return false;
              const hash = digest(response);
              const approved = new Set(validations.filter(item => item.stepId === step.id && item.contentHash === hash).map(item => item.userId));
              return members.length > 0 && members.every(item => approved.has(item.userId));
            });
            if (!complete) return fail(409, 'GROUP_VALIDATION_REQUIRED', 'Todos os integrantes precisam validar a resposta atual de cada atividade selecionada antes do envio.');
            for (const stepId of candidates) { if (!submittedStepIds.includes(stepId)) submittedStepAt[stepId] = new Date().toISOString(); }
            submittedStepIds = [...new Set([...submittedStepIds, ...candidates])];
          }
          const allStepsSubmitted = version.steps.every(step => submittedStepIds.includes(step.id));
          const nextStatus: 'draft' | 'partial' | 'submitted' | 'reviewed' = requestedStepIds.length ? (allStepsSubmitted ? 'submitted' : 'partial') : input.status === 'draft' && old?.status === 'partial' ? 'partial' : input.status;
          const nextRevision = (old?.revision ?? 0) + 1;
          const nextStepRevisions = { ...existingStepRevisions };
          if (input.stepId) nextStepRevisions[input.stepId] = nextRevision;
          else for (const stepId of new Set([...Object.keys(existingResponses), ...Object.keys(stepResponses)]))
            if (existingResponses[stepId] !== stepResponses[stepId]) nextStepRevisions[stepId] = nextRevision;
          const data = { audio, hasAudio: !!audio, textFile, hasTextFile: textFile !== null, content: input.content, stepResponses, stepRevisions: nextStepRevisions,
            submittedStepIds: submittedStepIds as Prisma.InputJsonValue, submittedStepAt: submittedStepAt as Prisma.InputJsonValue, updatedById: userId,
            currentStepId: staleStepWrite ? old!.currentStepId : input.currentStepId,
            completedStepIds: (staleStepWrite ? existingCompletedStepIds : input.completedStepIds) as Prisma.InputJsonValue,
            stepCompletedAt: completedAt as Prisma.InputJsonValue, status: nextStatus,
            submittedAt: nextStatus === 'submitted' ? new Date() : null };
          const saved = old && !retry ? await tx.submission.update({ where: { id: old.id }, data: { ...data, revision: { increment: 1 } } }) :
            await tx.submission.create({ data: { ...data, versionId: version.id, userId, groupId: group?.id ?? null,
              attempt: ((await tx.submission.aggregate({ where: { versionId: version.id, userId }, _max: { attempt: true } }))._max.attempt ?? 0) + 1,
              revision: (old?.revision ?? 0) + 1 } });
          return submissionView(await tx.submission.findUniqueOrThrow({ where: { id: saved.id }, include: submissionInclude }));
        }
        if (op === 'submissions') {
          const rows = await tx.submission.findMany({ ...pageArgs(paging), where: { ...after(paging), version: { missionId: id },
            ...(member.role === 'student' ? { OR: [{ userId, groupId: null }, { group: { members: { some: { userId } } } }] } : { status: { in: ['partial', 'submitted', 'reviewed'] } }) }, include: submissionInclude });
          return pagination(rows.map(row => submissionView(row, member.role !== 'student')), paging.limit);
        }
      }
      if (['submission', 'feedback', 'submissionAudio', 'submissionTextFile', 'validateSubmissionStep'].includes(op)) {
        const row = await tx.submission.findFirst({ where: { id, version: { mission: { classroom: { memberships: { some: { userId, active: true } } } } } }, include: { ...submissionInclude, version: { include: { mission: true, steps: { orderBy: { position: 'asc' as const }, include: { deadlineExtensions: true } } } } } });
        if (!row) return missing();
        const member = await membership(tx, userId, row.version.mission.classroomId);
        const groupMember = member.role === 'student' && row.groupId && await tx.missionGroupMember.findUnique({ where: { groupId_userId: { groupId: row.groupId, userId } } });
        if (row.userId !== userId && !groupMember && (!isInstructorRole(member.role) || row.status === 'draft')) return missing();
        if (op === 'validateSubmissionStep') {
          if (member.role !== 'student' || !['draft', 'partial'].includes(row.status) || !row.groupId || !groupMember) return missing();
          const step = row.version.steps.find(item => item.id === p.stepId);
          if (!step) return missing();
          const submittedStepIds = Array.isArray(row.submittedStepIds) ? row.submittedStepIds : [];
          if (submittedStepIds.includes(step.id)) return fail(409, 'SUBMITTED_STEP_LOCKED', 'Esta atividade já foi enviada ao professor.');
          const input = body as Body<'validateSubmissionStep'>;
          const responses = row.stepResponses && typeof row.stepResponses === 'object' && !Array.isArray(row.stepResponses) ? row.stepResponses as Record<string, string> : {};
          const response = responses[step.id] ?? (row.currentStepId === step.id ? row.content : '');
          if (!response.trim()) return fail(409, 'STEP_RESPONSE_REQUIRED', 'Escreva uma resposta nesta etapa antes de validá-la.');
          const revisions = row.stepRevisions && typeof row.stepRevisions === 'object' && !Array.isArray(row.stepRevisions) ? row.stepRevisions as Record<string, number> : {};
          if ((revisions[step.id] ?? 0) !== input.expectedStepRevision) return fail(409, 'STEP_REVISION_CONFLICT', 'Esta etapa mudou. Confira a versão atual antes de validá-la.');
          await tx.submissionStepValidation.upsert({ where: { submissionId_stepId_userId: { submissionId: row.id, stepId: step.id, userId } },
            create: { submissionId: row.id, stepId: step.id, userId, contentHash: digest(response) }, update: { contentHash: digest(response), validatedAt: new Date() } });
          return submissionView(await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: submissionInclude }));
        }
        if (op === 'submissionAudio') { if (!row.audio || isInstructorRole(member.role) && row.status === 'partial') return missing(); return { base64: Buffer.from(row.audio).toString('base64'), mimeType: 'audio/wav' }; }
        if (op === 'submissionTextFile') { if (row.textFile === null || isInstructorRole(member.role) && row.status === 'partial') return missing(); return { name: 'atividade.txt', text: row.textFile }; }
        if (op === 'submission') return submissionView(row, isInstructorRole(member.role));
        if (!isInstructorRole(member.role) || row.status === 'draft') return missing();
        if (row.status === 'partial') return fail(409, 'PARTIAL_NOT_READY', 'A equipe ainda está enviando outras atividades. O feedback e a avaliação ficam disponíveis após a entrega completa.');
        const { content, requestRevision = false, scores } = body as Body<'feedback'>;
        let totalPoints: number | null = null;
        const graded = await tx.step.findMany({ where: { versionId: row.versionId }, select: { id: true, maxPoints: true } });
        if (!requestRevision && graded.some(step => step.maxPoints === null || step.maxPoints < 1))
          return fail(409, 'SCORING_NOT_CONFIGURED', 'Esta atividade tem etapas sem pontuação máxima válida. Configure de 1 a 100 pontos em cada etapa antes de avaliar.');
        if (!requestRevision && graded.length && scores === undefined)
          return fail(400, 'MISSING_SCORES', 'Informe uma nota de 1 ponto ou mais para cada etapa antes de concluir a avaliação.');
        if (scores !== undefined) {
          if (requestRevision) return fail(400, 'INVALID_SCORES', 'Avalie após a revisão solicitada.');
          if (graded.some(step => step.maxPoints === null || step.maxPoints < 1) || graded.length !== scores.length ||
            new Set(scores.map(score => score.stepId)).size !== scores.length ||
            scores.some(score => !graded.some(step => step.id === score.stepId && score.points <= step.maxPoints!)))
            return fail(400, 'INVALID_SCORES', 'Informe uma nota maior que zero e dentro do limite para cada etapa.');
          totalPoints = scores.reduce((sum, score) => sum + score.points, 0);
        }
        if (row.status === 'reviewed') {
          if (row.revisionRequested === requestRevision && row.feedback.some(f => f.teacherId === userId && f.content === content &&
            JSON.stringify(f.scores ?? null) === JSON.stringify(scores ?? null))) return submissionView(row);
          return fail(409, 'ALREADY_REVIEWED', 'Esta entrega já tem revisão.');
        }
        const saved = await tx.submission.update({ where: { id }, data: { status: 'reviewed', revisionRequested: requestRevision,
          feedback: { create: { teacherId: userId, content, scores: scores ?? undefined, totalPoints } } }, include: submissionInclude });
        return submissionView(saved);
      }
      if (op === 'createBarrier') {
        const step = await tx.step.findFirst({ where: { id, version: { mission: { classroom: { memberships: { some: { userId, active: true } } } } } }, include: { version: { include: { mission: true } } } });
        if (!step) return missing();
        await scopedMission(tx, userId, step.version.missionId);
        if (step.version.mission.publishedVersionId !== step.versionId) return missing();
        const input = body as Body<'createBarrier'>;
        return barrierView(await tx.barrierReport.create({ data: { ...input, stepId: id, userId } }));
      }
      if (op === 'barrier' || op === 'respondBarrier') {
        const row = await tx.barrierReport.findFirst({ where: { id, step: { version: { mission: { classroom: { memberships: { some: { userId, active: true } } } } } } }, include: { step: { include: { version: { include: { mission: true } } } } } });
        if (!row) return missing();
        const member = await membership(tx, userId, row.step.version.mission.classroomId);
        if (row.userId !== userId && !(isInstructorRole(member.role) && row.sharedWithTeacher)) return missing();
        if (op === 'barrier') return barrierView(row);
        if (!isInstructorRole(member.role) || !row.sharedWithTeacher) return missing();
        return barrierView(await tx.barrierReport.update({ where: { id }, data: { response: (body as Body<'respondBarrier'>).response, respondedBy: userId } }));
      }
      return missing();
    });
  }

  preferenceView(p: {fontSize: string; spacing: string; contrast: string; reducedDistractions: boolean} | null) {
    return p ? { fontSize: p.fontSize, spacing: p.spacing, contrast: p.contrast, reducedDistractions: p.reducedDistractions } : {};
  }

  async download(userId: string, id: string) {
    const material = await this.db.material.findFirst({ where: { id, version: { mission: { classroom: { memberships: { some: { userId, active: true } } } } } }, include: { version: { include: { mission: true } } } });
    if (!material) return missing();
    const { member } = await scopedMission(this.db, userId, material.version.missionId);
    if (member.role === 'student' && material.version.mission.publishedVersionId !== material.versionId) return missing();
    if (!material.storagePath || material.fileStatus !== 'verified') return missing();
    if (!this.config.storageKey || !this.config.storageURL) return fail(503, 'STORAGE_UNAVAILABLE', 'Arquivo temporariamente indisponível.');
    const origin = new URL(this.config.storageURL);
    if (origin.protocol !== 'https:' || origin.origin !== this.config.storageURL) return fail(503, 'STORAGE_UNAVAILABLE', 'Arquivo temporariamente indisponível.');
    const path = material.storagePath.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${origin.origin}/storage/v1/object/sign/travessia-private/${path}`, { method: 'POST',
      headers: { apikey: this.config.storageKey, Authorization: `Bearer ${this.config.storageKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }), signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!response.ok) return fail(503, 'STORAGE_UNAVAILABLE', 'Arquivo temporariamente indisponível.');
    const data = await response.json() as { signedURL?: string };
    if (!data.signedURL?.startsWith('/object/sign/')) return fail(503, 'STORAGE_UNAVAILABLE', 'Arquivo temporariamente indisponível.');
    return { url: `${origin.origin}/storage/v1${data.signedURL}`, expiresIn: 60 };
  }
}
