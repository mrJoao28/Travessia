import { randomUUID } from 'node:crypto';
import type { MaterialAdaptation, MaterialSource, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { Body, Operation } from './contracts.js';
import { serial } from './database.js';
import { fail, missing } from './errors.js';
import { scopedMission } from './product.service.js';
import { budget, digest } from './rate-limit.js';
import { documentPage, materialDocument, materialSettings } from './material-contracts.js';
import { checkDiskBudget, materialPath, removeMaterialFiles, storeOriginal } from './material-files.js';
import type { Config } from './config.js';
export const extractedPages = z.array(z.strictObject({ page: z.number().int().min(1).max(20), text: z.string().max(40000), hasVisual: z.boolean(), ocr: z.boolean() })).max(20);
export const sourcePublic = (s: MaterialSource) => ({ id: s.id, versionId: s.versionId, title: s.title, status: s.status, pageCount: s.pageCount,
  pages: s.status === 'ready' ? extractedPages.parse(s.pages) : [], warnings: z.array(z.string()).parse(s.warnings), expiresAt: s.expiresAt });
export const adaptationPublic = (s: MaterialAdaptation) => ({ mode: materialSettings.parse(s.settings).deliveryMode??'adapted', id: s.id, versionId: s.versionId, sourceId: s.sourceId, studentId: s.studentId,
  status: s.status, settings: materialSettings.parse(s.settings), pages: z.array(z.number()).parse(s.pages), document: z.array(documentPage).parse(s.document), revision: s.revision,
  error: s.error, hasAudio: s.hasAudio, inputTokens: s.inputTokens, outputTokens: s.outputTokens, expiresAt: s.expiresAt });
export class MaterialService {
  constructor(readonly db: PrismaClient, readonly config: Config) {}
  async execute(op: Operation, userId: string, p: Record<string, string>, body: unknown, query: unknown): Promise<unknown> {
    let cleanupId: string | null = null;
    try { return await serial(this.db, async tx => {
      const learner = op === 'learnerMaterials';
      const { row, member } = await scopedMission(tx, userId, p.id, !learner);
      const current = (versionId: string) => { if (![row.draftVersionId, row.publishedVersionId].includes(versionId)) return fail(409, 'VERSION_CONFLICT', 'A versão mudou. Reabra a missão.'); };
      if (learner) {
        if (member.role !== 'student') return missing();
        const { versionId } = query as { versionId: string };
        if (row.publishedVersionId !== versionId) return missing();
        const rows = await tx.materialAdaptation.findMany({ where: { versionId, studentId: userId, status: 'released', expiresAt: { gt: new Date() }, source: { status: 'ready', expiresAt: { gt: new Date() } } }, include: { source: { select: { title: true } } }, orderBy: { createdAt: 'asc' }, take: 100 });
        return { items: rows.map(a => ({ id: a.id, title: a.source.title, mode: materialSettings.parse(a.settings).deliveryMode??'adapted', document: materialSettings.parse(a.settings).deliveryMode==='original' ? [] : materialDocument.parse(a.document), hasAudio: a.hasAudio })) };
      }
      if (['materialSources', 'materialAdaptations'].includes(op)) {
        const { versionId } = query as { versionId: string }; current(versionId);
        return { items: op === 'materialSources' ? (await tx.materialSource.findMany({ where: { versionId, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' }, take: 30 })).map(sourcePublic)
          : (await tx.materialAdaptation.findMany({ where: { versionId, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' }, take: 100 })).map(adaptationPublic) };
      }
      if (row.status === 'archived') return fail(409, 'MISSION_ARCHIVED', 'Missão arquivada.');
      if (op === 'uploadMaterialSource') {
        const input = body as Body<'uploadMaterialSource'>; current(input.versionId);
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64)) return fail(400, 'INVALID_PDF', 'Envie um PDF válido.');
        const bytes = Buffer.from(input.base64, 'base64');
        if (bytes.length > 10 * 1024 * 1024 || bytes.length < 8 || bytes.subarray(0, 5).toString() !== '%PDF-') return fail(400, 'INVALID_PDF', 'Envie um PDF de até 10 MB.');
        const hash = digest(input.base64);
        const old = await tx.materialSource.findUnique({ where: { versionId_requestKey: { versionId: input.versionId, requestKey: input.requestKey } } });
        if (old) { if (old.hash !== hash || old.title !== input.title) return fail(409, 'IDEMPOTENCY_CONFLICT', 'Solicitação já utilizada.'); return sourcePublic(old); }
        const duplicate = await tx.materialSource.findFirst({ where: { versionId: input.versionId, hash, status: { not: 'failed' }, expiresAt: { gt: new Date() } } });
        if (duplicate) return sourcePublic(duplicate);
        if (await tx.materialSource.count({ where: { versionId: input.versionId } }) >= 30) return fail(409, 'MATERIAL_LIMIT', 'Até 30 arquivos por versão. Remova arquivos não usados.');
        await budget(tx, `material-upload:${userId}`, 20, 86400);
        try { await checkDiskBudget(); } catch { return fail(503, 'MATERIAL_STORAGE_FULL', 'Armazenamento de materiais indisponível.'); }
        const id = randomUUID(); cleanupId = id; await storeOriginal(id, bytes);
        const result = await tx.materialSource.create({ data: { id, versionId: input.versionId, creatorId: userId, title: input.title, hash, requestKey: input.requestKey, expiresAt: new Date(Date.now() + 90 * 86400000) } });
        await tx.auditEvent.create({ data: { actorId: userId, action: 'material.upload', resourceId: id } });
        return sourcePublic(result);
      }
      if (op === 'deleteMaterialSource') {
        const source = await tx.materialSource.findFirst({ where: { id: p.sourceId, version: { missionId: row.id } } }); if (!source) return missing(); current(source.versionId);
        if (['queued', 'extracting'].includes(source.status) || await tx.materialAdaptation.count({ where: { sourceId: source.id, status: { in: ['queued', 'generating', 'rendering'] } } })) return fail(409, 'MATERIAL_BUSY', 'Aguarde o processamento.');
        // Mark expired atomically; worker removes metadata and associated files after commit.
        await tx.materialSource.update({ where: { id: source.id }, data: { expiresAt: new Date(0) } });
        await tx.materialAdaptation.updateMany({ where: { sourceId: source.id }, data: { expiresAt: new Date(0) } });
        return { removed: true };
      }
      if (op === 'releaseOriginalMaterial') {
        const input=body as Body<'releaseOriginalMaterial'>;current(input.versionId);
        const source=await tx.materialSource.findFirst({where:{id:input.sourceId,versionId:input.versionId,status:'ready',expiresAt:{gt:new Date()}}});if(!source)return missing();
        if(!await tx.membership.findFirst({where:{classroomId:row.classroomId,userId:input.studentId,role:'student',active:true}}))return fail(400,'INVALID_RECIPIENTS','Escolha um aluno ativo desta turma.');
        const hash=digest(JSON.stringify({mode:'original',versionId:input.versionId,sourceId:input.sourceId,studentId:input.studentId}));
        const old=await tx.materialAdaptation.findUnique({where:{versionId_requestKey:{versionId:input.versionId,requestKey:input.requestKey}}});
        if(old){if(old.requestHash!==hash)return fail(409,'IDEMPOTENCY_CONFLICT','Solicitação já utilizada.');if(old.expiresAt<=new Date())return missing();return adaptationPublic(old);}
        const cached=await tx.materialAdaptation.findFirst({where:{versionId:input.versionId,requestHash:hash,studentId:input.studentId,status:'released',expiresAt:{gt:new Date()}}});if(cached)return adaptationPublic(cached);
        if(await tx.materialAdaptation.count({where:{versionId:input.versionId}})>=100)return fail(409,'MATERIAL_LIMIT','Até 100 materiais por versão.');
        await budget(tx,`material-original:${userId}`,30,86400);
        const saved=await tx.materialAdaptation.create({data:{versionId:input.versionId,sourceId:source.id,studentId:input.studentId,creatorId:userId,requestKey:input.requestKey,requestHash:hash,status:'released',settings:{supports:[],fontSize:'18',color:'default',useAi:false,approvedForProvider:false,deliveryMode:'original'},pages:[],document:[],expiresAt:source.expiresAt}});
        await tx.auditEvent.create({data:{actorId:userId,action:'material.original-release',resourceId:saved.id}});return adaptationPublic(saved);
      }
      if (op === 'prepareMaterial') {
        const input = body as Body<'prepareMaterial'>; current(input.versionId);
        const source = await tx.materialSource.findFirst({ where: { id: input.sourceId, versionId: input.versionId, status: 'ready', expiresAt: { gt: new Date() } } }); if (!source) return missing();
        if (!await tx.membership.findFirst({ where: { classroomId: row.classroomId, userId: input.studentId, role: 'student', active: true } })) return fail(400, 'INVALID_RECIPIENTS', 'Escolha um aluno ativo desta turma.');
        const selected = extractedPages.parse(source.pages).filter(v => input.pages.includes(v.page));
        if (selected.length !== input.pages.length) return fail(400, 'INVALID_PAGES', 'Confira as páginas.');
        if (selected.reduce((n, v) => n + v.text.length, 0) > 12000) return fail(400, 'INPUT_TOO_LARGE', 'Selecione menos páginas (até 12 mil caracteres por adaptação).');
        const requiresAi = input.settings.supports.some(s => ['literal-language', 'short-sections', 'glossary', 'image-description'].includes(s));
        if (requiresAi && !input.settings.useAi) return fail(400, 'AI_REQUIRED', 'Esses apoios precisam de rascunho IA. Você pode escolher apenas formatação e áudio locais.');
        if (input.settings.useAi && (!this.config.aiEnabled || !input.settings.approvedForProvider)) return fail(503, 'AI_UNAVAILABLE', 'Ative e autorize a assistência antes de gerar.');
        const requestHash = digest(JSON.stringify({ ...input, requestKey: undefined, settings: { ...input.settings, supports: [...input.settings.supports].sort() }, pages: [...input.pages].sort((a,b) => a-b) }));
        const old = await tx.materialAdaptation.findUnique({ where: { versionId_requestKey: { versionId: input.versionId, requestKey: input.requestKey } } });
        if (old) { if (old.requestHash !== requestHash) return fail(409, 'IDEMPOTENCY_CONFLICT', 'Solicitação já utilizada.'); return adaptationPublic(old); }
        if (await tx.materialAdaptation.count({ where: { versionId: input.versionId } }) >= 100) return fail(409, 'MATERIAL_LIMIT', 'Até 100 adaptações por versão.');
        // Reuse only same recipient, source, version and instructions; never broaden release.
        const cached = await tx.materialAdaptation.findFirst({ where: { versionId: input.versionId, studentId: input.studentId, requestHash, status: { not: 'failed' }, expiresAt: { gt: new Date() } } });
        if (cached) return adaptationPublic(cached);
        await budget(tx, `material-prepare:${userId}`, input.settings.useAi ? 10 : 30, 86400);
        if (input.settings.useAi && await tx.materialAdaptation.count({ where: { creatorId: userId, status: { in: ['queued', 'generating'] }, settings: { path: ['useAi'], equals: true } } })) return fail(429, 'AI_BUSY', 'Aguarde sua preparação em andamento.');
        const saved = await tx.materialAdaptation.create({ data: { versionId: input.versionId, sourceId: source.id, studentId: input.studentId, creatorId: userId,
          requestKey: input.requestKey, requestHash, settings: input.settings, pages: [...input.pages].sort((a,b)=>a-b), expiresAt: source.expiresAt } });
        await tx.auditEvent.create({ data: { actorId: userId, action: 'material.prepare', resourceId: saved.id } });
        return adaptationPublic(saved);
      }
      const old = await tx.materialAdaptation.findFirst({ where: { id: p.adaptationId, version: { missionId: row.id }, expiresAt: { gt: new Date() } } }); if (!old) return missing(); current(old.versionId);
      if (['queued', 'generating', 'rendering'].includes(old.status)) return fail(409, 'MATERIAL_BUSY', 'Aguarde o processamento.');
      if (op === 'removeMaterial') { await tx.materialAdaptation.update({ where: { id: old.id }, data: { expiresAt: new Date(0), status: 'draft' } }); return { removed: true }; }
      if(materialSettings.parse(old.settings).deliveryMode==='original')return fail(409,'ORIGINAL_UNCHANGED','O original permanece inalterado. Prepare outra versão para adaptar.');
      const input = body as Body<'editMaterial'> | Body<'releaseMaterial'>;
      if (old.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT', 'A revisão mudou. Reabra a adaptação.');
      if (op === 'editMaterial') {
        const document = materialDocument.parse((input as Body<'editMaterial'>).document);
        if (JSON.stringify(document.map(p => p.page).sort((a,b)=>a-b)) !== JSON.stringify(z.array(z.number()).parse(old.pages))) return fail(400, 'INVALID_PAGES', 'Mantenha todas as páginas selecionadas.');
        if (document.reduce((n,p)=>n+p.text.length+p.description.length,0)>20000) return fail(400, 'INPUT_TOO_LARGE', 'Até 20 mil caracteres por adaptação.');
        return adaptationPublic(await tx.materialAdaptation.update({ where: { id: old.id }, data: { document, status: 'draft', revision: { increment: 1 }, hasAudio: false, error: null } }));
      }
      if (op === 'renderMaterial') {
        materialDocument.parse(old.document);
        if (materialSettings.parse(old.settings).supports.includes('image-description') && materialDocument.parse(old.document).some(v => !v.description.trim())) return fail(400, 'DESCRIPTION_REQUIRED', 'Descreva a informação visual, ou indique que a página não tem imagens relevantes.');
        return adaptationPublic(await tx.materialAdaptation.update({ where: { id: old.id }, data: { status: 'rendering', startedAt: null, error: null } }));
      }
      if (op === 'releaseMaterial') {
        if (old.status === 'released') return adaptationPublic(old);
        if (old.status !== 'ready') return fail(409, 'REVIEW_REQUIRED', 'Gere e confira os arquivos desta revisão antes de liberar.');
        if (!await tx.membership.findFirst({ where: { userId: old.studentId, classroomId: row.classroomId, active: true, role: 'student' } })) return missing();
        const saved = await tx.materialAdaptation.update({ where: { id: old.id }, data: { status: 'released' } });
        await tx.auditEvent.create({ data: { actorId: userId, action: 'material.release', resourceId: old.id } }); return adaptationPublic(saved);
      }
      return missing();
    }); } catch (error) { if (cleanupId) await removeMaterialFiles(cleanupId); throw error; }
  }
  async asset(userId: string, p: Record<string,string>) {
    return serial(this.db, async tx => {
      const { row, member } = await scopedMission(tx, userId, p.id);
      if (p.kind === 'original') {
        if (member.role !== 'teacher') return missing();
        const source = await tx.materialSource.findFirst({ where: { id: p.assetId, version: { missionId: row.id }, status: 'ready', expiresAt: { gt: new Date() } } });
        if (!source || ![row.draftVersionId, row.publishedVersionId].includes(source.versionId)) return missing();
        return { path: materialPath(source.id, 'original.pdf'), mime: 'application/pdf', name: 'original.pdf' };
      }
      if (!['pdf','audio'].includes(p.kind) && !/^page-(?:[1-9]|1[0-9]|20)$/.test(p.kind)) return missing();
      const a = await tx.materialAdaptation.findFirst({ where: { id: p.assetId, version: { missionId: row.id }, status: { in: ['ready', 'released'] }, expiresAt: { gt: new Date() }, source: { status: 'ready', expiresAt: { gt: new Date() } } } });
      if (!a || ![row.draftVersionId, row.publishedVersionId].includes(a.versionId)) return missing();
      if (member.role === 'student' && (a.studentId !== userId || a.status !== 'released' || a.versionId !== row.publishedVersionId)) return missing();
      if(materialSettings.parse(a.settings).deliveryMode==='original'){if(p.kind!=='pdf')return missing();return {path:materialPath(a.sourceId,'original.pdf'),mime:'application/pdf',name:'material-original.pdf'};}
      if (p.kind.startsWith('page-')) {
        const page = Number(p.kind.slice(5)); if (!z.array(z.number()).parse(a.pages).includes(page)) return missing();
        return { path: materialPath(a.sourceId, `page-${page}.png`), mime: 'image/png', name: 'pagina-original.png' };
      }
      if (p.kind === 'audio' && !a.hasAudio) return missing();
      return p.kind === 'pdf' ? { path: materialPath(a.id, `adapted-${a.revision}.pdf`), mime: 'application/pdf', name: 'material-adaptado.pdf' }
        : { path: materialPath(a.id, `audio-${a.revision}.mp3`), mime: 'audio/mpeg', name: 'material-narrado.mp3' };
    });
  }
}
