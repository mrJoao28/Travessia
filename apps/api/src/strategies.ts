import type { Prisma, PrismaClient } from '@prisma/client';
import type { Body, Operation, Paging } from './contracts.js';
import { serial, type Tx } from './database.js';
import { fail, missing } from './errors.js';
import { scopedMission } from './product.service.js';
import { digest } from './rate-limit.js';
import { verifySupportAudio } from './support-audio.js';
import { strategyCatalog } from './strategy-catalog.js';

const itemSelect = { id: true, strategyId: true, title: true, content: true, hasAudio: true };
const include = { items: { orderBy: { position: 'asc' as const }, select: itemSelect }, recipients: {
  orderBy: { userId: 'asc' as const }, include: { user: { select: { name: true } } },
} };
type Row = Prisma.StrategyPlanGetPayload<{ include: typeof include }>;
const view = (row: Row) => ({ id: row.id, versionId: row.versionId, stepId: row.stepId, audience: row.audience,
  revision: row.revision, items: row.items.map(i => ({ id: i.id, strategyId: i.strategyId, title: i.title, content: i.content, hasAudio: i.hasAudio })),
  recipients: row.recipients.map(r => ({ id: r.userId, name: r.user.name })) });

function currentVersion(row: { draftVersionId: string | null; publishedVersionId: string | null }, versionId: string) {
  if (versionId !== row.draftVersionId && versionId !== row.publishedVersionId) return missing();
}
async function validatePlan(tx: Tx, classroomId: string, input: Body<'createStrategyPlan'> | Body<'updateStrategyPlan'>) {
  if (input.stepId && !await tx.step.findFirst({ where: { id: input.stepId, versionId: input.versionId } })) return missing();
  if (input.audience === 'students') {
    const count = await tx.membership.count({ where: { classroomId, userId: { in: input.studentIds }, role: 'student', active: true } });
    if (count !== input.studentIds.length) return fail(400, 'INVALID_RECIPIENTS', 'Escolha apenas alunos com vínculo ativo nesta turma.');
  }
}
async function itemData(tx: Tx, items: Body<'createStrategyPlan'>['items'], planId?: string) {
  let total = 0;
  return Promise.all(items.map(async (item, position) => {
    let audio: Uint8Array<ArrayBuffer> | null = null;
    if (item.audio && 'base64' in item.audio) audio = verifySupportAudio(item.audio.base64);
    if (item.audio && 'itemId' in item.audio) {
      if (!planId) return missing();
      const existing = await tx.strategyItem.findFirst({ where: { id: item.audio.itemId, planId, strategyId: item.strategyId }, select: { audio: true } });
      if (!existing?.audio) return missing();
      audio = existing.audio;
    }
    total += audio?.byteLength ?? 0;
    if (total > 1048576) return fail(400, 'AUDIO_LIMIT', 'Até 1 MiB de áudio por aplicação.');
    return { strategyId: item.strategyId, content: item.content, position, audio, hasAudio: !!audio,
      title: strategyCatalog.find(s => s.id === item.strategyId)!.title };
  }));
}

export class StrategyService {
  constructor(readonly db: PrismaClient) {}
  async execute(op: Operation, userId: string, p: Record<string, string>, body: unknown, query: unknown) {
    if (op === 'strategyCatalog') return { items: strategyCatalog };
    return serial(this.db, async tx => {
      const { row, member } = await scopedMission(tx, userId, p.id, !['missionSupports', 'supportAudio'].includes(op));
      if (op === 'supportAudio') {
        const item = await tx.strategyItem.findFirst({ where: { id: p.itemId, plan: { version: { missionId: row.id } } }, include: { plan: { include: { recipients: { where: { userId }, select: { userId: true } } } } } });
        if (!item?.audio) return missing();
        const plan = item.plan;
        if (member.role === 'student' && (row.publishedVersionId !== plan.versionId || (plan.audience !== 'classroom' && !plan.recipients.length))) return missing();
        if (member.role === 'teacher') currentVersion(row, plan.versionId);
        return { base64: Buffer.from(item.audio).toString('base64'), mimeType: 'audio/wav' as const };
      }
      if (op === 'missionSupports') {
        if (member.role !== 'student') return missing();
        const { versionId } = query as { versionId: string };
        if (row.publishedVersionId !== versionId) return fail(409, 'VERSION_CONFLICT', 'A missão mudou. Recarregue antes de consultar os apoios.');
        // Filter recipients in SQL, before serialization. No names, audience or other
        // students' support content ever enter a student's response.
        const plans = await tx.strategyPlan.findMany({ where: { versionId, OR: [
          { audience: 'classroom' }, { audience: 'students', recipients: { some: { userId } } },
        ] }, orderBy: { id: 'asc' }, include: { items: { orderBy: { position: 'asc' }, select: itemSelect } } });
        return { versionId, items: plans.flatMap(plan => plan.items.map(item => ({ id: item.id, stepId: plan.stepId, title: item.title, content: item.content, hasAudio: item.hasAudio }))) };
      }
      if (op === 'strategyRecipients') {
        const { cursor, limit } = query as Paging;
        const rows = await tx.user.findMany({ where: { ...(cursor ? { id: { gt: cursor } } : {}), memberships: {
          some: { classroomId: row.classroomId, role: 'student', active: true },
        } }, orderBy: { id: 'asc' }, take: limit + 1, select: { id: true, name: true } });
        const items = rows.slice(0, limit);
        return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
      }
      if (op === 'strategyPlans') {
        const { versionId } = query as { versionId: string }; currentVersion(row, versionId);
        return { items: (await tx.strategyPlan.findMany({ where: { versionId }, orderBy: { id: 'asc' }, include })).map(view) };
      }
      if (row.status === 'archived') return fail(409, 'MISSION_ARCHIVED', 'A missão está arquivada.');
      if (op === 'createStrategyPlan') {
        const input = body as Body<'createStrategyPlan'>; currentVersion(row, input.versionId);
        const requestHash = digest(JSON.stringify({ versionId: input.versionId, stepId: input.stepId, audience: input.audience,
          studentIds: [...input.studentIds].sort(), items: input.items }));
        const old = await tx.strategyPlan.findUnique({ where: { versionId_requestKey: { versionId: input.versionId, requestKey: input.requestKey } }, include });
        if (old) {
          if (old.requestHash !== requestHash) return fail(409, 'IDEMPOTENCY_CONFLICT', 'Solicitação já usada com outro conteúdo.');
          return view(old);
        }
        await validatePlan(tx, row.classroomId, input);
        if (await tx.strategyPlan.count({ where: { versionId: input.versionId } }) >= 20) return fail(409, 'SUPPORT_LIMIT', 'Até 20 aplicações por versão. Edite ou remova uma aplicação existente.');
        const plan = await tx.strategyPlan.create({ data: { versionId: input.versionId, stepId: input.stepId, audience: input.audience,
          requestKey: input.requestKey, requestHash, items: { create: await itemData(tx, input.items) },
          recipients: { create: input.studentIds.map(userId => ({ userId })) },
        }, include });
        await tx.auditEvent.create({ data: { actorId: userId, action: 'strategy.apply', resourceId: plan.id } });
        return view(plan);
      }
      const plan = await tx.strategyPlan.findFirst({ where: { id: p.planId, version: { missionId: row.id } }, include });
      if (!plan) return missing(); currentVersion(row, plan.versionId);
      const { expectedRevision } = body as Body<'removeStrategyPlan'>;
      if (plan.revision !== expectedRevision) return fail(409, 'REVISION_CONFLICT', 'A aplicação mudou. Recarregue antes de salvar ou remover.');
      if (op === 'removeStrategyPlan') {
        await tx.strategyPlan.delete({ where: { id: plan.id } });
        await tx.auditEvent.create({ data: { actorId: userId, action: 'strategy.remove', resourceId: plan.id } });
        return { removed: true as const };
      }
      const input = body as Body<'updateStrategyPlan'>;
      if (input.versionId !== plan.versionId) return fail(400, 'INVALID_VERSION', 'Crie uma aplicação na versão desejada.');
      await validatePlan(tx, row.classroomId, input);
      const preparedItems = await itemData(tx, input.items, plan.id);
      await tx.strategyItem.deleteMany({ where: { planId: plan.id } });
      await tx.strategyRecipient.deleteMany({ where: { planId: plan.id } });
      const updated = await tx.strategyPlan.update({ where: { id: plan.id }, data: { stepId: input.stepId, audience: input.audience,
        revision: { increment: 1 }, items: { create: preparedItems }, recipients: { create: input.studentIds.map(userId => ({ userId })) },
      }, include });
      await tx.auditEvent.create({ data: { actorId: userId, action: 'strategy.update', resourceId: plan.id } });
      return view(updated);
    });
  }
}
