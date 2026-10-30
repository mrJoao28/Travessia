import { randomBytes } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { missionInput, type Body, type MissionInput, type Operation, type Paging } from './contracts.js';
import type { Config } from './config.js';
import { fail, missing } from './errors.js';
import { serial, type Tx } from './database.js';
import { budget, digest } from './rate-limit.js';
import { AiService, type DraftProvider } from './ai.js';
import { getProfile, updateProfile } from './profiles.js';

const versionInclude = { steps: { orderBy: { position: 'asc' as const } }, materials: true };
const missionInclude = { draftVersion: { include: versionInclude }, publishedVersion: { include: versionInclude } };
const submissionInclude = { feedback: { orderBy: { createdAt: 'asc' as const } } };
type MissionRow = Prisma.MissionGetPayload<{ include: typeof missionInclude }>;

export function missionView(row: MissionRow, teacher: boolean) {
  const version = (v: MissionRow['draftVersion']) => v && ({ id: v.id, missionId: v.missionId, title: v.title,
    description: v.description, objectives: v.objectives, criteria: v.criteria, source: v.source, dueAt: v.dueAt,
    createdAt: v.createdAt, steps: v.steps.map(s => ({ id: s.id, position: s.position, title: s.title, instructions: s.instructions, example: s.example })),
    materials: v.materials.map(m => ({ id: m.id, title: m.title, text: m.text, hasFile: Boolean(m.storagePath) })) });
  return { id: row.id, classroomId: row.classroomId, status: row.status,
    draftVersion: teacher ? version(row.draftVersion) : null, publishedVersion: version(row.publishedVersion) };
}
export function submissionView(s: Prisma.SubmissionGetPayload<{ include: typeof submissionInclude }>) {
  return { id: s.id, versionId: s.versionId, userId: s.userId, status: s.status, content: s.content,
    completedStepIds: s.completedStepIds, currentStepId: s.currentStepId, revision: s.revision,
    submittedAt: s.submittedAt, updatedAt: s.updatedAt,
    feedback: s.feedback.map(f => ({ id: f.id, content: f.content, createdAt: f.createdAt })) };
}
export const barrierView = (b: {id: string; stepId: string; description: string; sharedWithTeacher: boolean; response: string | null; createdAt: Date}) =>
  ({ id: b.id, stepId: b.stepId, description: b.description, sharedWithTeacher: b.sharedWithTeacher, response: b.response, createdAt: b.createdAt });

export async function membership(tx: Tx, userId: string, classroomId: string, teacher = false) {
  const member = await tx.membership.findFirst({ where: { userId, classroomId, active: true, ...(teacher ? { role: 'teacher' } : {}) } });
  return member ?? missing();
}
export async function scopedMission(tx: Tx, userId: string, id: string, teacher = false) {
  const row = await tx.mission.findFirst({ where: { id, classroom: { memberships: { some: { userId, active: true, ...(teacher ? { role: 'teacher' } : {}) } } } }, include: missionInclude });
  if (!row) return missing();
  const member = await membership(tx, userId, row.classroomId, teacher);
  if (member.role === 'student' && row.status !== 'published') return missing();
  return { row, member };
}
export async function createVersion(tx: Tx, missionId: string, input: MissionInput, source = 'manual') {
  return tx.missionVersion.create({ data: { missionId, title: input.title, description: input.description,
    objectives: input.objectives, criteria: input.criteria, dueAt: input.dueAt ? new Date(input.dueAt) : null, source,
    steps: { create: input.steps.map((s, position) => ({ ...s, position: position + 1 })) }, materials: { create: input.materials } }, include: versionInclude });
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
    const id = p.id;
    const paging = query as Paging;
    if (op === 'health') return { status: 'ok', service: 'travessia-api', stage: 'mvp' };
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
      return serial(this.db, async tx => {
        const invite = await tx.invitation.findUnique({ where: { tokenHash: digest((body as Body<'acceptInvite'>).token) } });
        if (!invite || invite.revokedAt || invite.consumedAt || invite.expiresAt <= new Date()) return fail(400, 'INVALID_INVITATION', 'Convite indisponível.');
        const old = await tx.membership.findUnique({ where: { userId_classroomId: { userId, classroomId: invite.classroomId } } });
        // Revoked accounts cannot regain access by consuming another invitation.
        if (old) return fail(409, 'MEMBERSHIP_EXISTS', 'Vínculo já existente. Consulte o docente.');
        const changed = await tx.invitation.updateMany({ where: { id: invite.id, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date(), consumedBy: userId } });
        if (!changed.count) return fail(400, 'INVALID_INVITATION', 'Convite indisponível.');
        await tx.membership.create({ data: { userId, classroomId: invite.classroomId, role: 'student' } });
        const c = await tx.classroom.findUniqueOrThrow({ where: { id: invite.classroomId } });
        return { id: c.id, name: c.name, role: 'student' };
      });
    }
    if (op === 'generate') return this.ai.generate(userId, id, body as Body<'generate'>);
    if (op === 'generation') return this.ai.get(userId, id);
    if (op === 'download') return this.download(userId, id);

    return serial(this.db, async tx => {
      if (['members', 'revokeMember', 'invite', 'revokeInvite', 'missions', 'createMission', 'barriers', 'upload'].includes(op)) {
        const member = await membership(tx, userId, id, ['members', 'revokeMember', 'invite', 'revokeInvite', 'createMission', 'upload'].includes(op));
        if (op === 'members') {
          const rows = await tx.membership.findMany({ ...pageArgs(paging), where: { ...after(paging), classroomId: id }, include: { user: { select: { name: true } } } });
          return pagination(rows.map(m => ({ id: m.id, name: m.user.name, role: m.role, active: m.active })), paging.limit);
        }
        if (op === 'revokeMember') {
          const target = await tx.membership.findFirst({ where: { id: p.memberId, classroomId: id, role: 'student' } });
          if (!target) return missing();
          await tx.membership.update({ where: { id: target.id }, data: { active: false } });
          await tx.auditEvent.create({ data: { actorId: userId, resourceId: target.id, action: 'membership.revoke' } });
          return { revoked: true };
        }
        if (op === 'invite') {
          // Count within the same serializable transaction to bound issuance across instances.
          if (await tx.invitation.count({ where: { classroomId: id, createdAt: { gt: new Date(Date.now() - 3600000) } } }) >= 30) return fail(429, 'RATE_LIMITED', 'Limite de convites atingido.');
          const token = randomBytes(32).toString('hex');
          const invite = await tx.invitation.create({ data: { classroomId: id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
          return { id: invite.id, token, expiresAt: invite.expiresAt };
        }
        if (op === 'revokeInvite') {
          const result = await tx.invitation.updateMany({ where: { id: p.invitationId, classroomId: id }, data: { revokedAt: new Date() } });
          if (!result.count) return missing();
          return { revoked: true };
        }
        if (op === 'missions') {
          const rows = await tx.mission.findMany({ ...pageArgs(paging), where: { ...after(paging), classroomId: id, ...(member.role === 'student' ? { status: 'published' } : {}) }, include: missionInclude });
          return pagination(rows.map(m => missionView(m, member.role === 'teacher')), paging.limit);
        }
        if (op === 'createMission') {
          const m = await tx.mission.create({ data: { classroomId: id } });
          const version = await createVersion(tx, m.id, body as MissionInput);
          const row = await tx.mission.update({ where: { id: m.id }, data: { draftVersionId: version.id }, include: missionInclude });
          return missionView(row, true);
        }
        if (op === 'upload') return fail(503, 'UPLOAD_DISABLED', 'Envio de arquivos indisponível. Use material textual.');
        if (op === 'barriers') {
          const rows = await tx.barrierReport.findMany({ ...pageArgs(paging), where: { ...after(paging), step: { version: { mission: { classroomId: id } } },
            OR: [{ userId }, ...(member.role === 'teacher' ? [{ sharedWithTeacher: true }] : [])] } });
          return pagination(rows.map(barrierView), paging.limit);
        }
      }
      if (['mission', 'editMission', 'publish', 'archive', 'saveSubmission', 'submissions'].includes(op)) {
        const { row, member } = await scopedMission(tx, userId, id, ['editMission', 'publish', 'archive'].includes(op));
        if (op === 'mission') return missionView(row, member.role === 'teacher');
        if (op === 'editMission') {
          const input = body as Body<'editMission'>;
          if (row.status === 'archived' || row.draftVersionId !== input.expectedDraftVersionId) return fail(409, 'VERSION_CONFLICT', 'A missão mudou. Recarregue antes de salvar.');
          const version = await createVersion(tx, row.id, input);
          const changed = await tx.mission.update({ where: { id }, data: { draftVersionId: version.id }, include: missionInclude });
          return missionView(changed, true);
        }
        if (op === 'publish') {
          const input = body as Body<'publish'>;
          if (row.status === 'published' && row.publishedVersionId === input.versionId && !row.draftVersionId) return missionView(row, true);
          if (row.status === 'archived' || row.draftVersionId !== input.versionId || !row.draftVersion) return fail(409, 'VERSION_CONFLICT', 'Selecione o rascunho atual para revisão.');
          const v = row.draftVersion;
          missionInput.parse({ title: v.title, description: v.description, objectives: v.objectives, criteria: v.criteria,
            dueAt: v.dueAt?.toISOString() ?? null,
            steps: v.steps.map(s => ({ title: s.title, instructions: s.instructions, example: s.example })),
            materials: v.materials.map(m => ({ title: m.title, text: m.text })) });
          const changed = await tx.mission.update({ where: { id }, data: { status: 'published', publishedVersionId: input.versionId, draftVersionId: null }, include: missionInclude });
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
          if (input.status === 'submitted' && !input.content.trim()) return fail(400, 'EMPTY_SUBMISSION', 'Inclua sua atividade antes de enviar.');
          const old = await tx.submission.findUnique({ where: { versionId_userId: { versionId: version.id, userId } } });
          if ((old?.revision ?? 0) !== input.expectedRevision) {
            if (old && old.content === input.content && old.status === input.status && old.currentStepId === input.currentStepId && JSON.stringify(old.completedStepIds) === JSON.stringify(input.completedStepIds)) return submissionView(await tx.submission.findUniqueOrThrow({ where: { id: old.id }, include: submissionInclude }));
            return fail(409, 'REVISION_CONFLICT', 'A entrega mudou. Recarregue antes de salvar.');
          }
          if (old && old.status !== 'draft') return fail(409, 'SUBMISSION_LOCKED', 'Entrega enviada preservada para revisão.');
          const data = { content: input.content, currentStepId: input.currentStepId, completedStepIds: input.completedStepIds, status: input.status,
            submittedAt: input.status === 'submitted' ? new Date() : null };
          const saved = old ? await tx.submission.update({ where: { id: old.id }, data: { ...data, revision: { increment: 1 } }, include: submissionInclude }) :
            await tx.submission.create({ data: { ...data, versionId: version.id, userId }, include: submissionInclude });
          return submissionView(saved);
        }
        if (op === 'submissions') {
          const rows = await tx.submission.findMany({ ...pageArgs(paging), where: { ...after(paging), version: { missionId: id },
            ...(member.role === 'student' ? { userId } : { status: { in: ['submitted', 'reviewed'] } }) }, include: submissionInclude });
          return pagination(rows.map(submissionView), paging.limit);
        }
      }
      if (op === 'submission' || op === 'feedback') {
        const row = await tx.submission.findFirst({ where: { id, version: { mission: { classroom: { memberships: { some: { userId, active: true } } } } } }, include: { ...submissionInclude, version: { include: { mission: true } } } });
        if (!row) return missing();
        const member = await membership(tx, userId, row.version.mission.classroomId);
        if (row.userId !== userId && (member.role !== 'teacher' || row.status === 'draft')) return missing();
        if (op === 'submission') return submissionView(row);
        if (member.role !== 'teacher' || row.status === 'draft') return missing();
        const content = (body as Body<'feedback'>).content;
        if (row.status === 'reviewed') {
          if (row.feedback.some(f => f.teacherId === userId && f.content === content)) return submissionView(row);
          return fail(409, 'ALREADY_REVIEWED', 'Esta entrega já tem revisão.');
        }
        const saved = await tx.submission.update({ where: { id }, data: { status: 'reviewed', feedback: { create: { teacherId: userId, content } } }, include: submissionInclude });
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
        if (row.userId !== userId && !(member.role === 'teacher' && row.sharedWithTeacher)) return missing();
        if (op === 'barrier') return barrierView(row);
        if (member.role !== 'teacher' || !row.sharedWithTeacher) return missing();
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
