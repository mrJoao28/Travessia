import type { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { disabilityCode, needCode, responseFormat, type Body, type Operation, type Paging } from './contracts.js';
import { serial, type Tx } from './database.js';
import { fail, missing } from './errors.js';
import { membership, scopedMission } from './product.service.js';
import { digest } from './rate-limit.js';

export const learningOptions = {
  supports: [
    { id: 'image-description', label: 'Descrição das informações visuais' }, { id: 'transcript', label: 'Transcrição de áudio ou vídeo' },
    { id: 'clear-instructions', label: 'Instruções mais claras' }, { id: 'short-steps', label: 'Tarefa dividida em passos curtos' },
    { id: 'worked-example', label: 'Exemplo comentado' }, { id: 'glossary', label: 'Explicação de termos' },
    { id: 'audio-response', label: 'Possibilidade de responder por áudio' }, { id: 'text-file', label: 'Possibilidade de anexar arquivo de texto' },
  ],
  disabilities: [{ id: 'visual', label: 'Visual' }, { id: 'hearing', label: 'Auditiva' }, { id: 'physical', label: 'Física' },
    { id: 'intellectual', label: 'Intelectual' }, { id: 'multiple', label: 'Múltipla' }, { id: 'other', label: 'Outra deficiência autodeclarada' }],
  formats: [{ id: 'text', label: 'Texto no editor' }, { id: 'audio', label: 'Áudio de até 30 segundos' }, { id: 'text_file', label: 'Arquivo de texto (.txt)' }],
} as const;
const emptyNeeds = { disabilities: [], supports: [], preferredFormats: [], revision: 0 };
const needsView = (p: { disabilities: Prisma.JsonValue; supports: Prisma.JsonValue; preferredFormats: Prisma.JsonValue; revision: number } | null) => p ? {
  disabilities: z.array(disabilityCode).parse(p.disabilities), supports: z.array(needCode).parse(p.supports), preferredFormats: z.array(responseFormat).parse(p.preferredFormats), revision: p.revision,
} : emptyNeeds;
const include = { recipients: { orderBy: { userId: 'asc' as const }, select: { userId: true } } };
type Plan = Prisma.ActivityAdaptationGetPayload<{ include: typeof include }>;
const view = (p: Plan) => ({ id: p.id, versionId: p.versionId, stepId: p.stepId, audience: p.audience, instructions: p.instructions, example: p.example,
  supportNeeds: p.supportNeeds, allowedFormats: p.allowedFormats, studentIds: p.recipients.map(r => r.userId), revision: p.revision });
export async function learnerPlans(tx: Tx, versionId: string, userId: string) {
  return tx.activityAdaptation.findMany({ where: { versionId, OR: [{ audience: 'classroom' }, { audience: 'students', recipients: { some: { userId } } }] }, orderBy: { id: 'asc' } });
}
export function allowedFormats(plans: { allowedFormats: Prisma.JsonValue }[]) {
  return [...new Set(['text', ...plans.flatMap(p => z.array(responseFormat).parse(p.allowedFormats))])];
}
export class LearningService {
  constructor(readonly db: PrismaClient) {}
  async execute(op: Operation, userId: string, p: Record<string, string>, body: unknown, query: unknown) {
    if (op === 'learningOptions') return learningOptions;
    return serial(this.db, async tx => {
      if (op === 'learningNeeds') return needsView(await tx.learningNeeds.findUnique({ where: { userId } }));
      if (op === 'updateLearningNeeds') {
        const { expectedRevision, ...data } = body as Body<'updateLearningNeeds'>;
        const old = await tx.learningNeeds.findUnique({ where: { userId } });
        if ((old?.revision ?? 0) !== expectedRevision) return fail(409, 'REVISION_CONFLICT', 'Suas escolhas mudaram. Recarregue antes de salvar.');
        const saved = await tx.learningNeeds.upsert({ where: { userId }, create: { userId, ...data }, update: { ...data, revision: { increment: 1 } } });
        // A revised profile never silently broadens an earlier sharing permission.
        await tx.needsSharing.updateMany({ where: { userId }, data: { shared: false, includeDisabilities: false, revision: { increment: 1 } } });
        await tx.auditEvent.create({ data: { actorId: userId, action: 'learning-needs.update', resourceId: userId } });
        return needsView(saved);
      }
      if (['needsSharing', 'updateNeedsSharing', 'sharedLearningNeeds'].includes(op)) {
        const member = await membership(tx, userId, p.id, op === 'sharedLearningNeeds');
        if (op === 'sharedLearningNeeds') {
          const { cursor, limit } = query as Paging;
          const rows = await tx.user.findMany({ where: { ...(cursor ? { id: { gt: cursor } } : {}), learningNeeds: { isNot: null },
            memberships: { some: { classroomId: p.id, active: true, role: 'student' } }, needsSharing: { some: { classroomId: p.id, shared: true } } },
            orderBy: { id: 'asc' }, take: limit + 1, include: { learningNeeds: true, needsSharing: { where: { classroomId: p.id, shared: true } } } });
          return { items: rows.slice(0, limit).map(u => { const n = needsView(u.learningNeeds); return { userId: u.id, name: u.name, supports: n.supports,
            preferredFormats: n.preferredFormats, disabilities: u.needsSharing[0].includeDisabilities ? n.disabilities : null }; }), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
        }
        if (member.role !== 'student') return missing();
        const where = { userId_classroomId: { userId, classroomId: p.id } };
        const old = await tx.needsSharing.findUnique({ where });
        if (op === 'needsSharing') return old ? { classroomId: p.id, shared: old.shared, includeDisabilities: old.includeDisabilities, revision: old.revision } : { classroomId: p.id, shared: false, includeDisabilities: false, revision: 0 };
        const input = body as Body<'updateNeedsSharing'>;
        if ((old?.revision ?? 0) !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT', 'O compartilhamento mudou. Recarregue.');
        if (input.shared && !await tx.learningNeeds.findUnique({ where: { userId } })) return fail(400, 'NEEDS_REQUIRED', 'Salve suas escolhas primeiro.');
        const data = { shared: input.shared, includeDisabilities: input.shared && input.includeDisabilities };
        const saved = await tx.needsSharing.upsert({ where, create: { userId, classroomId: p.id, ...data }, update: { ...data, revision: { increment: 1 } } });
        await tx.auditEvent.create({ data: { actorId: userId, action: saved.shared ? 'learning-needs.share' : 'learning-needs.revoke', resourceId: p.id } });
        return { classroomId: p.id, shared: saved.shared, includeDisabilities: saved.includeDisabilities, revision: saved.revision };
      }
      const { row, member } = await scopedMission(tx, userId, p.id, op !== 'learnerAdaptations');
      if (op === 'learnerAdaptations') {
        if (member.role !== 'student') return missing();
        const { versionId } = query as { versionId: string };
        if (row.publishedVersionId !== versionId) return fail(409, 'VERSION_CONFLICT', 'A missão mudou. Recarregue.');
        const plans = await learnerPlans(tx, versionId, userId);
        return { versionId, allowedFormats: allowedFormats(plans), items: plans.map(p => ({ id: p.id, stepId: p.stepId, instructions: p.instructions, example: p.example })) };
      }
      const current = (id: string) => { if (![row.draftVersionId, row.publishedVersionId].includes(id)) return missing(); };
      if (op === 'adaptationPlans') {
        const { versionId } = query as { versionId: string }; current(versionId);
        return { items: (await tx.activityAdaptation.findMany({ where: { versionId }, orderBy: { id: 'asc' }, include })).map(view) };
      }
      if (row.status === 'archived') return fail(409, 'MISSION_ARCHIVED', 'Missão arquivada.');
      if (op === 'removeAdaptation') {
        const old = await tx.activityAdaptation.findFirst({ where: { id: p.planId, version: { missionId: row.id } } });
        if (!old) return missing(); current(old.versionId);
        if (old.revision !== (body as Body<'removeAdaptation'>).expectedRevision) return fail(409, 'REVISION_CONFLICT', 'A adaptação mudou.');
        await tx.activityAdaptation.delete({ where: { id: old.id } });
        await tx.auditEvent.create({ data: { actorId: userId, action: 'adaptation.remove', resourceId: old.id } });
        return { removed: true };
      }
      const input = body as Body<'createAdaptation'> | Body<'updateAdaptation'>; current(input.versionId);
      if (input.stepId && !await tx.step.findFirst({ where: { id: input.stepId, versionId: input.versionId } })) return missing();
      if (input.audience === 'students' && await tx.membership.count({ where: { classroomId: row.classroomId, role: 'student', active: true, userId: { in: input.studentIds } } }) !== input.studentIds.length)
        return fail(400, 'INVALID_RECIPIENTS', 'Escolha alunos ativos desta turma.');
      const data = { versionId: input.versionId, stepId: input.stepId, audience: input.audience, instructions: input.instructions, example: input.example, supportNeeds: input.supportNeeds, allowedFormats: input.allowedFormats };
      const recipients = { create: input.studentIds.map(userId => ({ userId })) };
      let saved: Plan;
      if (op === 'createAdaptation') {
        const key = (input as Body<'createAdaptation'>).requestKey;
        const hash = digest(JSON.stringify({ ...data, studentIds: [...input.studentIds].sort() }));
        const old = await tx.activityAdaptation.findUnique({ where: { versionId_requestKey: { versionId: input.versionId, requestKey: key } }, include });
        if (old) { if (old.requestHash !== hash) return fail(409, 'IDEMPOTENCY_CONFLICT', 'Solicitação já utilizada.'); return view(old); }
        if (await tx.activityAdaptation.count({ where: { versionId: input.versionId } }) >= 20) return fail(409, 'ADAPTATION_LIMIT', 'Até 20 adaptações por versão.');
        saved = await tx.activityAdaptation.create({ data: { ...data, requestKey: key, requestHash: hash, recipients }, include });
      } else {
        const old = await tx.activityAdaptation.findFirst({ where: { id: p.planId, versionId: input.versionId } });
        if (!old) return missing();
        if (old.revision !== (input as Body<'updateAdaptation'>).expectedRevision) return fail(409, 'REVISION_CONFLICT', 'A adaptação mudou.');
        await tx.adaptationRecipient.deleteMany({ where: { adaptationId: old.id } });
        saved = await tx.activityAdaptation.update({ where: { id: old.id }, data: { ...data, revision: { increment: 1 }, recipients }, include });
      }
      await tx.auditEvent.create({ data: { actorId: userId, action: 'adaptation.review', resourceId: saved.id } });
      return view(saved);
    });
  }
}
