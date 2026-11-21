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
  version: { include: { steps: { orderBy: { position: 'asc' as const }, include: { deadlineExtensions: true } } } } };
type MissionRow = Prisma.MissionGetPayload<{ include: typeof missionInclude }>;

export function missionView(row: MissionRow, teacher: boolean) {
  const version = (v: MissionRow['draftVersion']) => v && ({ id: v.id, missionId: v.missionId, title: v.title, workMode: v.workMode,
    description: v.description, objectives: v.objectives, criteria: v.criteria, source: v.source, dueAt: v.dueAt,
    createdAt: v.createdAt, steps: v.steps.map(s => ({ id: s.id, position: s.position, title: s.title, instructions: s.instructions, example: s.example,
      dueAt: s.dueAt, deadlineExtended: false, maxPoints: s.maxPoints })),
    materials: v.materials.map(m => ({ id: m.id, title: m.title, text: m.text, hasFile: Boolean(m.storagePath) })) });
  return { id: row.id, classroomId: row.classroomId, status: row.status,
    draftVersion: teacher ? version(row.draftVersion) : null, publishedVersion: version(row.publishedVersion) };
}
export function submissionView(s: Prisma.SubmissionGetPayload<{ include: typeof submissionInclude }>) {
  const completions = s.stepCompletedAt && typeof s.stepCompletedAt === 'object' && !Array.isArray(s.stepCompletedAt)
    ? s.stepCompletedAt as Record<string, string> : {};
  return { id: s.id, versionId: s.versionId, userId: s.userId, groupId: s.groupId, status: s.status, content: s.content, hasAudio: s.hasAudio, hasTextFile: s.hasTextFile,
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
export async function scopedMission(tx: Tx, userId: string, id: string, teacher = false) {
  const row = await tx.mission.findFirst({ where: { id, classroom: { memberships: { some: { userId, active: true,
    role: teacher ? { in: [...instructorRoles] } : { in: [...classroomRoles] } } } } }, include: missionInclude });
  if (!row) return missing();
  const member = await membership(tx, userId, row.classroomId, teacher);
  if (member.role === 'student' && row.status !== 'published') return missing();
  return { row, member };
}
export async function createVersion(tx: Tx, missionId: string, input: MissionInput, source = 'manual') {
  return tx.missionVersion.create({ data: { missionId, title: input.title, description: input.description, workMode: input.workMode ?? 'individual',
    objectives: input.objectives, criteria: input.criteria, dueAt: input.dueAt ? new Date(input.dueAt) : null, source,
    steps: { create: input.steps.map((s, position) => ({ title: s.title, instructions: s.instructions, example: s.example,
      dueAt: s.dueAt ? new Date(s.dueAt) : null, maxPoints: s.maxPoints ?? null, position: position + 1 })) }, materials: { create: input.materials } }, include: versionInclude });
}
function pagination<T extends {id: string}>(rows: T[], limit: number) {
  const hasNext = rows.length > limit;
  const items = rows.slice(0, limit);
  return { items, nextCursor: hasNext ? items.at(-1)!.id : null };
}
const pageArgs = (p: Paging) => ({ take: p.limit + 1, orderBy: { id: 'asc' as const }, ...(p.cursor ? { where: { id: { gt: p.cursor } } } : {}) });
const after = (p: Paging) => p.cursor ? { id: { gt: p.cursor } } : {};

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
      const rows = await this.db.classroom.findMany({ ...pageArgs(paging), where: { ...after(paging), memberships: { some: { userId, active: true } } },
        include: { memberships: { where: { userId, active: true }, select: { role: true } } } });
      return pagination(rows.map(c => ({ id: c.id, name: c.name, role: c.memberships[0].role })), paging.limit);
    }
    if (op === 'createClassroom') {
      await budget(this.db, `create-classroom:${userId}`, 10, 3600);
      const data = body as Body<'createClassroom'>;
      const c = await this.db.classroom.create({ data: { name: data.name, memberships: { create: { userId, role: 'teacher' } } } });
      return { id: c.id, name: c.name, role: 'teacher' };
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
      if (['mission', 'editMission', 'publish', 'archive', 'saveSubmission', 'submissions', 'setStepDeadlineExtension', 'groups', 'createGroup', 'removeGroup'].includes(op)) {
        const { row, member } = await scopedMission(tx, userId, id, ['publish', 'archive', 'setStepDeadlineExtension'].includes(op));
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
          if (relevant?.workMode !== 'group') return { items: [] };
          const groups = await tx.missionGroup.findMany({ where: { missionId: id, ...(member.role === 'student' ? { members: { some: { userId } } } : {}) }, include: { members: { select: { userId: true } } }, orderBy: { name: 'asc' } });
          return { items: groups.map(g => ({ id: g.id, name: g.name, studentIds: g.members.map(m => m.userId) })) };
        }
        if (op === 'createGroup') {
          if (!isInstructorRole(member.role) || row.status === 'archived') return missing();
          if (row.draftVersion?.workMode !== 'group' && row.publishedVersion?.workMode !== 'group') return fail(409, 'INDIVIDUAL_ACTIVITY', 'Esta atividade é individual.');
          const data = body as Body<'createGroup'>;
          if (await tx.missionGroup.count({ where: { missionId: id, name: data.name } })) return fail(409, 'GROUP_NAME_EXISTS', 'Já existe uma equipe com este nome nesta atividade.');
          const students = await tx.membership.count({ where: { classroomId: row.classroomId, role: 'student', active: true, userId: { in: data.studentIds } } });
          if (students !== data.studentIds.length) return fail(400, 'INVALID_RECIPIENTS', 'Escolha alunos ativos desta turma.');
          const already = await tx.missionGroupMember.count({ where: { userId: { in: data.studentIds }, group: { missionId: id } } });
          if (already) return fail(409, 'GROUP_MEMBERSHIP_EXISTS', 'Um aluno já pertence a outra equipe desta atividade.');
          const group = await tx.missionGroup.create({ data: { missionId: id, name: data.name, members: { create: data.studentIds.map(userId => ({ userId })) } } });
          await tx.auditEvent.create({ data: { actorId: userId, action: 'group.create', resourceId: group.id } });
          return { id: group.id, name: group.name, studentIds: data.studentIds };
        }
        if (op === 'removeGroup') {
          if (!isInstructorRole(member.role) || row.status === 'archived') return missing();
          const group = await tx.missionGroup.findFirst({ where: { id: p.groupId, missionId: id } });
          if (!group) return missing();
          if (await tx.submission.count({ where: { groupId: group.id } })) return fail(409, 'GROUP_HAS_SUBMISSIONS', 'Esta equipe já possui uma entrega.');
          await tx.missionGroup.delete({ where: { id: group.id } });
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
          const group = version.workMode === 'group' ? await tx.missionGroup.findFirst({ where: { missionId: row.id, members: { some: { userId, user: { memberships: { some: { classroomId: row.classroomId, active: true, role: 'student' } } } } } } }) : null;
          if (version.workMode === 'group' && !group) return fail(409, 'GROUP_REQUIRED', 'Peça ao professor para incluir você em uma equipe desta atividade.');
          const old = await tx.submission.findFirst({ where: { versionId: version.id, ...(group ? { groupId: group.id } : { userId, groupId: null }) }, orderBy: { attempt: 'desc' } });
          if ((old?.revision ?? 0) !== input.expectedRevision) {
            if (old && input.audio === undefined && input.textFile === undefined && old.content === input.content && old.status === input.status && old.currentStepId === input.currentStepId && JSON.stringify(old.completedStepIds) === JSON.stringify(input.completedStepIds)) return submissionView(await tx.submission.findUniqueOrThrow({ where: { id: old.id }, include: submissionInclude }));
            return fail(409, 'REVISION_CONFLICT', 'A entrega mudou. Recarregue antes de salvar.');
          }
          const retry = old?.status === 'reviewed' && old.revisionRequested;
          if (old && old.status !== 'draft' && !retry) return fail(409, 'SUBMISSION_LOCKED', 'Entrega enviada preservada para revisão.');
          const audio = input.audio === undefined ? (retry ? null : old?.audio) ?? null : input.audio === null ? null : verifySupportAudio(input.audio);
          const textFile = input.textFile === undefined ? (retry ? null : old?.textFile) ?? null : input.textFile?.text ?? null;
          if (textFile !== null && (Buffer.byteLength(textFile, 'utf8') > 32768 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(textFile))) return fail(400, 'INVALID_TEXT_FILE', 'Use arquivo de texto UTF-8, até 32 KiB, sem conteúdo binário.');
          const formats = allowedFormats(await learnerPlans(tx, version.id, userId));
          if ((audio && !formats.includes('audio')) || (textFile !== null && !formats.includes('text_file'))) return fail(409, 'FORMAT_NOT_ALLOWED', 'O professor não liberou este formato. Preserve sua resposta e consulte os formatos atuais.');
          if (input.status === 'submitted' && !input.content.trim() && !audio && !textFile?.trim()) return fail(400, 'EMPTY_SUBMISSION', 'Inclua sua atividade antes de enviar.');
          const completedAt: Record<string, string> = retry ? {} : old?.stepCompletedAt && typeof old.stepCompletedAt === 'object' && !Array.isArray(old.stepCompletedAt)
            ? { ...(old.stepCompletedAt as Record<string, string>) } : {};
          for (const completedId of input.completedStepIds) if (!completedAt[completedId]) completedAt[completedId] = new Date().toISOString();
          const data = { audio, hasAudio: !!audio, textFile, hasTextFile: textFile !== null, content: input.content, currentStepId: input.currentStepId, completedStepIds: input.completedStepIds, stepCompletedAt: completedAt, status: input.status,
            submittedAt: input.status === 'submitted' ? new Date() : null };
          const saved = old && !retry ? await tx.submission.update({ where: { id: old.id }, data: { ...data, revision: { increment: 1 } }, include: submissionInclude }) :
            await tx.submission.create({ data: { ...data, versionId: version.id, userId, groupId: group?.id ?? null, attempt: (old?.attempt ?? 0) + 1, revision: (old?.revision ?? 0) + 1 }, include: submissionInclude });
          return submissionView(saved);
        }
        if (op === 'submissions') {
          const rows = await tx.submission.findMany({ ...pageArgs(paging), where: { ...after(paging), version: { missionId: id },
            ...(member.role === 'student' ? { OR: [{ userId, groupId: null }, { group: { members: { some: { userId } } } }] } : { status: { in: ['submitted', 'reviewed'] } }) }, include: submissionInclude });
          return pagination(rows.map(submissionView), paging.limit);
        }
      }
      if (['submission', 'feedback', 'submissionAudio', 'submissionTextFile'].includes(op)) {
        const row = await tx.submission.findFirst({ where: { id, version: { mission: { classroom: { memberships: { some: { userId, active: true } } } } } }, include: { ...submissionInclude, version: { include: { mission: true, steps: { orderBy: { position: 'asc' as const }, include: { deadlineExtensions: true } } } } } });
        if (!row) return missing();
        const member = await membership(tx, userId, row.version.mission.classroomId);
        const groupMember = member.role === 'student' && row.groupId && await tx.missionGroupMember.findUnique({ where: { groupId_userId: { groupId: row.groupId, userId } } });
        if (row.userId !== userId && !groupMember && (!isInstructorRole(member.role) || row.status === 'draft')) return missing();
        if (op === 'submissionAudio') { if (!row.audio) return missing(); return { base64: Buffer.from(row.audio).toString('base64'), mimeType: 'audio/wav' }; }
        if (op === 'submissionTextFile') { if (row.textFile === null) return missing(); return { name: 'atividade.txt', text: row.textFile }; }
        if (op === 'submission') return submissionView(row);
        if (!isInstructorRole(member.role) || row.status === 'draft') return missing();
        const { content, requestRevision = false, scores } = body as Body<'feedback'>;
        let totalPoints: number | null = null;
        const graded = await tx.step.findMany({ where: { versionId: row.versionId, maxPoints: { not: null } }, select: { id: true, maxPoints: true } });
        if (!requestRevision && graded.length && scores === undefined)
          return fail(400, 'MISSING_SCORES', 'Informe a nota de cada etapa antes de concluir a avaliação.');
        if (scores !== undefined) {
          if (requestRevision) return fail(400, 'INVALID_SCORES', 'Avalie após a revisão solicitada.');
          if (graded.length !== scores.length || new Set(scores.map(score => score.stepId)).size !== scores.length ||
            scores.some(score => !graded.some(step => step.id === score.stepId && score.points <= step.maxPoints!)))
            return fail(400, 'INVALID_SCORES', 'Informe uma nota válida para cada etapa com pontuação.');
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
