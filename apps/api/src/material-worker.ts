import { geminiFailure } from './gemini-errors.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { MaterialAdaptation, MaterialSource, PrismaClient } from '@prisma/client';
import { chromium } from 'playwright-core';
import { z } from 'zod';
import type { Config } from './config.js';
import { serial } from './database.js';
import { materialContentLength, materialDocument, materialSettings, storedMaterialSettings } from './material-contracts.js';
import { checkDiskBudget, materialPath, materialRoot, removeMaterialFiles, visualPage } from './material-files.js';
import { extractedPages } from './materials.js';
import { materialBatches, PDF_DOCUMENT_CHARACTERS, PDF_MAX_PAGES } from './material-limits.js';
import { materialProvider, type MaterialProvider } from './material-provider.js';

const tools = fileURLToPath(new URL('../material-tools/process.py', import.meta.url));
export async function localProcess(mode: 'extract' | 'audio', path: string, input = ''): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.MATERIAL_PYTHON ?? 'python3', [tools, mode, path], { stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH, LANG: 'C.UTF-8', OMP_NUM_THREADS: '1', PIPER_MODEL: process.env.PIPER_MODEL } });
    const chunks: Buffer[] = []; let size = 0; let ended = false;
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, mode === 'audio' ? 900000 : 360000);
    const maxOutput = 12 * 1024 * 1024;
    child.stdout.on('data', (v: Buffer) => { size += v.length; if (size > maxOutput) child.kill('SIGKILL'); else chunks.push(v); });
    child.stderr.resume(); // Never log parser errors: they can contain private file content.
    child.on('error', () => { clearTimeout(timer); if (!ended) { ended = true; reject(new Error('Local processor unavailable')); } });
    child.on('close', code => { clearTimeout(timer); if (ended) return; ended = true;
      if (code !== 0 || size > maxOutput) return reject(new Error('Local processing failed'));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Invalid processor result')); }
    });
    child.stdin.on('error', () => {}); child.stdin.end(input);
  });
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function documentHtml(document: z.infer<typeof materialDocument>, settings: z.infer<typeof materialSettings>, images: Record<number,string> = {}) {
  const colors = settings.color === 'dark' ? ['#fff','#173651'] : settings.color === 'high' ? ['#000','#fff'] : ['#173651','#fff'];
  const sections = document.map(p => `<section>
    <h2>${escapeHtml(p.title)}</h2><p class="source-note">Referência: página ${p.page} do original</p>
    <p>${escapeHtml(p.text)}</p>
    ${p.steps ? `<h3>Passos da atividade</h3>${p.steps.length
      ? `<ol>${p.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`
      : '<p>Sem ações identificadas nesta página.</p>'}` : ''}
    ${p.glossary ? `<h3>Glossário</h3>${p.glossary.length
      ? `<dl>${p.glossary.map(({ term, definition }) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(definition)}</dd></div>`).join('')}</dl>`
      : '<p>Sem termos selecionados nesta página.</p>'}` : ''}
    ${p.description ? `<h3>Descrição das informações visuais</h3><p>${escapeHtml(p.description)}</p>` : ''}
    ${images[p.page] ? `<figure><img alt="${escapeHtml(p.description || 'Referência visual da página original; confira o texto e as orientações do professor.')}" src="data:image/png;base64,${images[p.page]}"><figcaption>Referência visual da página ${p.page}. Use zoom para ampliar.</figcaption></figure>` : ''}
  </section>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Material adaptado</title><style>
    @page{size:A4;margin:18mm}
    body{font-family:Arial,sans-serif;font-size:${settings.supports.includes('large-print') ? settings.fontSize : '18'}pt;line-height:${settings.supports.includes('wide-spacing') ? '1.8' : '1.5'};color:${colors[0]};background:${colors[1]};overflow-wrap:anywhere}
    section{break-before:page}section:first-of-type{break-before:auto}
    h1{font-size:1.3em;margin:0 0 .6em}h2{font-size:1.15em;margin:1em 0 .5em;break-after:avoid}h3{font-size:1em;break-after:avoid}
    p{white-space:pre-wrap;margin:.65em 0}.document-note,.source-note{font-size:.85em}
    li,dd{white-space:pre-wrap}li,dl>div{margin-block:.45em}dt{font-weight:bold;break-after:avoid}dd{margin-inline-start:1em}
    figure{break-inside:avoid;margin:1em 0}img{display:block;max-width:100%;max-height:125mm;object-fit:contain;height:auto;width:auto}
    figcaption{font-size:.85em;margin-top:.5em}
    </style></head><body><h1>Material adaptado</h1><p class="document-note">Material preparado a partir das páginas indicadas. Consulte os objetivos e critérios na missão.</p>${sections}</body></html>`;
}
export async function renderPdf(path: string, html: string) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'], env: { PATH: process.env.PATH ?? '/usr/bin:/bin', LANG: 'C.UTF-8' } });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort()); // No network/file requests or model-supplied URLs.
    const page = await context.newPage(); await page.setContent(html, { timeout: 15000 });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([page.pdf({ path, format: 'A4', printBackground: true, tagged: true, outline: true }), new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('PDF render timeout')),90000);})]); } finally { if(timer) clearTimeout(timer); }
  } finally { await browser.close(); }
}
const instructions: Record<string,string> = {
  'literal-language': 'Usar linguagem literal e direta, explicar expressões figuradas sem perder precisão.',
  'short-sections': 'Preencher steps como lista em ordem, uma ação curta por item. Incluir apenas ações presentes no material, sem inventar tarefas ou respostas. Se a página não tiver ações, retornar steps vazio.',
  glossary: 'Preencher glossary com pares term e definition para termos técnicos relevantes presentes na página. Manter a grafia do termo e explicar seu sentido no contexto. Se não houver termos a explicar, retornar glossary vazio.',
  'image-description': 'Descrever relações, informações e dados relevantes das imagens recebidas, indicando incerteza.',
};
/** The exact ordered script spoken locally; no summarisation or external voice API. */
export function materialNarration(document: z.infer<typeof materialDocument>) {
  const text = document.map(p => [
    `Página ${p.page} do original.`, p.title, p.text,
    ...(p.steps?.length ? ['Passos da atividade.', ...p.steps.map((step, i) => `${i + 1}. ${step}`)] : []),
    ...(p.glossary?.length ? ['Glossário.', ...p.glossary.map(({ term, definition }) => `${term}: ${definition}`)] : []),
    ...(p.description.trim() ? ['Descrição das informações visuais.', p.description] : []),
    `Fim da página ${p.page}.`,
  ].filter(Boolean).join('\n')).join('\n\n');
  if (!text.trim() || text.length > PDF_DOCUMENT_CHARACTERS + 20000) throw new Error('Narration budget');
  return text;
}
class MaterialGeminiError extends Error {}

export class MaterialWorker {
  constructor(readonly db: PrismaClient, readonly config: Config, readonly provider: MaterialProvider = materialProvider(config),
    readonly local = localProcess, readonly pdf = renderPdf) {}
  async permitted(versionId: string, creatorId: string, studentId?: string) {
    return !!await this.db.missionVersion.findFirst({ where: { id: versionId, mission: { status: { not: 'archived' },
      OR: [{ draftVersionId: versionId }, { publishedVersionId: versionId }], classroom: { memberships: { some: { userId: creatorId, role: 'teacher', active: true } },
        ...(studentId ? { AND: [{ memberships: { some: { userId: studentId, role: 'student', active: true } } }] } : {}) } } } });
  }
  async tick() {
    const stale = new Date(Date.now()- 8*60000);
    // An abandoned external call is marked failed, never retried automatically (unknown provider charge).
    await this.db.materialSource.updateMany({ where: { status: 'extracting', startedAt: { lt: stale } }, data: { status: 'failed', warnings: ['Processamento interrompido. Envie novamente após conferir o arquivo.'] } });
    await this.db.materialAdaptation.updateMany({ where: { OR: [
      { status: 'generating', startedAt: { lt: stale } },
      { status: 'rendering', startedAt: { lt: new Date(Date.now() - 20 * 60000) } },
    ] }, data: { status: 'failed', error: 'Processamento interrompido. Nenhuma nova chamada IA foi realizada.' } });
    const job = await serial(this.db, async tx => {
      const source = await tx.materialSource.findFirst({ where: { status: 'queued', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' } });
      if (source) { const changed = await tx.materialSource.updateMany({ where: { id: source.id, status: 'queued' }, data: { status: 'extracting', startedAt: new Date() } }); return changed.count ? { type: 'source' as const, row: source } : null; }
      const adaptation = await tx.materialAdaptation.findFirst({ where: { OR: [{ status: 'queued' }, { status: 'rendering', startedAt: null }], expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' } });
      if (!adaptation) return null;
      const changed = await tx.materialAdaptation.updateMany({ where: { id: adaptation.id, status: adaptation.status, startedAt: adaptation.startedAt }, data: { status: adaptation.status === 'queued' ? 'generating' : 'rendering', startedAt: new Date() } });
      return changed.count ? { type: 'adaptation' as const, row: adaptation } : null;
    });
    if (!job) return false;
    try {
      await checkDiskBudget();
      if (job.type === 'source') await this.extract(job.row); else if (job.row.status === 'queued') await this.prepare(job.row); else await this.render(job.row);
    } catch (error) {
      if (job.type === 'source') await this.db.materialSource.updateMany({ where: { id: job.row.id, status: 'extracting' }, data: { status: 'failed', warnings: [`Não foi possível verificar o PDF. Use até ${PDF_MAX_PAGES} páginas, sem senha, formulários, anexos, links ou scripts.`] } });
      else {
        const parsed = storedMaterialSettings.safeParse(job.row.settings);
        const { regeneratePage, ...settings } = parsed.success ? parsed.data : { regeneratePage: undefined };
        await this.db.materialAdaptation.updateMany({
          where: { id: job.row.id, revision: job.row.revision, status: job.row.status === 'rendering' ? 'rendering' : 'generating' },
          data: {
            ...(parsed.success ? { settings } : {}),
            status: job.row.status === 'rendering' || regeneratePage ? 'draft' : 'failed',
            error: error instanceof MaterialGeminiError ? error.message : 'Não foi possível preparar esta revisão. Confira o conteúdo e a configuração.',
            hasAudio: false,
          },
        });
      }
    }
    return true;
  }
  async extract(source: MaterialSource) {
    if (!await this.permitted(source.versionId, source.creatorId)) throw new Error('Revoked');
    const result = z.strictObject({ pages: extractedPages.min(1), warnings: z.array(z.string().max(500)).max(PDF_MAX_PAGES * 2 + 1) }).parse(await this.local('extract', materialPath(source.id, 'original.pdf')));
    if (!await this.permitted(source.versionId, source.creatorId)) throw new Error('Revoked');
    await this.db.materialSource.updateMany({ where: { id: source.id, status: 'extracting', expiresAt: { gt: new Date() } }, data: { status: 'ready', pages: result.pages, warnings: result.warnings, pageCount: result.pages.length } });
  }
  async prepare(a: MaterialAdaptation) {
    if (!await this.permitted(a.versionId, a.creatorId, a.studentId)) throw new Error('Revoked');
    const source = await this.db.materialSource.findFirstOrThrow({ where: { id: a.sourceId, status: 'ready', expiresAt: { gt: new Date() } } });
    const { regeneratePage, ...settings } = storedMaterialSettings.parse(a.settings);
    const originalSelection = z.array(z.number()).parse(a.pages);
    const selected = regeneratePage ? [regeneratePage] : originalSelection;
    const pages = extractedPages.parse(source.pages).filter(p => selected.includes(p.page));
    if (pages.length !== selected.length) throw new Error('Missing source pages');
    let document: z.infer<typeof materialDocument> = pages.map(p => ({ page: p.page, title: `Página ${p.page}`, text: p.text, description: '' }));
    let inputTokens: number | undefined, outputTokens: number | undefined;
    if (settings.useAi) {
      if (!this.config.aiEnabled || !settings.approvedForProvider) throw new Error('Disabled');
      const version = await this.db.missionVersion.findUniqueOrThrow({ where: { id: a.versionId }, select: { objectives: true } });
      const objectives = z.array(z.string()).parse(version.objectives);
      const supports = settings.supports.filter(s=>instructions[s]).map(s=>instructions[s]);
      const descriptionsOnly = !settings.supports.some(s => ['literal-language','short-sections','glossary'].includes(s));
      document = [];
      for (const batch of materialBatches(pages)) {
        if (!await this.permitted(a.versionId, a.creatorId, a.studentId)) throw new Error('Revoked');
        // Renew the processing lease before each bounded provider call.
        const lease = await this.db.materialAdaptation.updateMany({ where: {
          id: a.id, revision: a.revision, status: 'generating', expiresAt: { gt: new Date() },
        }, data: { startedAt: new Date() } });
        if (!lease.count) throw new Error('Expired job');
        const batchPages = await Promise.all(batch.map(async p => ({
          page: p.page, text: p.text,
          ...(settings.supports.includes('image-description') ? { image: await visualPage(source.id, p.page) } : {}),
        })));
        if (batchPages.some(p=>p.image && p.image.length>2*1024*1024)) throw new Error('Image budget');
        const signal = AbortSignal.timeout(45000);
        let generated: Awaited<ReturnType<MaterialProvider>>;
        try {
          generated = await this.provider({ descriptionsOnly, objectives, supports, pages: batchPages }, signal);
        } catch (error) {
          throw new MaterialGeminiError(geminiFailure(error, signal.aborted).message);
        }
        const parsedBatch = materialDocument.parse(generated.document);
        if (parsedBatch.length !== batch.length || parsedBatch.some((p, i) => p.page !== batch[i].page))
          throw new Error('Missing batch pages');
        document.push(...parsedBatch);
        if (generated.inputTokens !== undefined) inputTokens = (inputTokens ?? 0) + generated.inputTokens;
        if (generated.outputTokens !== undefined) outputTokens = (outputTokens ?? 0) + generated.outputTokens;
      }
    }
    const withSteps = settings.supports.includes('short-sections');
    const withGlossary = settings.supports.includes('glossary');
    const rewrite = settings.supports.includes('literal-language');
    const describe = settings.supports.includes('image-description');
    const parsed = document.map(({ page, title, text, description, steps, glossary }) => {
      if ((withSteps && !steps) || (withGlossary && !glossary)) throw new Error('Missing requested material support');
      return {
        page, title: rewrite ? title : `Página ${page}`,
        text: rewrite ? text : pages.find(sourcePage => sourcePage.page === page)?.text ?? '',
        description: describe ? description : '',
        ...(withSteps && steps ? { steps } : {}),
        ...(withGlossary && glossary ? { glossary } : {}),
      };
    });
    if (JSON.stringify(parsed.map(p => p.page)) !== JSON.stringify(selected)) throw new Error('Missing pages');
    const prepared = regeneratePage ? materialDocument.parse(a.document).map(page => {
      if (page.page !== regeneratePage) return page;
      const replacement = parsed[0];
      const descriptionsOnly = !settings.supports.some(s => ['literal-language', 'short-sections', 'glossary'].includes(s));
      return descriptionsOnly ? { ...page, description: replacement.description } : replacement;
    }) : parsed;
    if (materialContentLength(prepared) > PDF_DOCUMENT_CHARACTERS) throw new Error('Output budget');
    if (!await this.permitted(a.versionId, a.creatorId, a.studentId)) throw new Error('Revoked');
    const needsDescription = describe && prepared.some(page => !page.description.trim());
    await this.db.materialAdaptation.updateMany({ where: { id: a.id, revision: a.revision, status: 'generating', expiresAt: { gt: new Date() } }, data: {
      document: prepared, settings, status: settings.autoRender && !needsDescription ? 'rendering' : 'draft', startedAt: null,
      inputTokens, outputTokens,
    } });
  }
  async render(a: MaterialAdaptation) {
    if (!await this.permitted(a.versionId, a.creatorId, a.studentId)) throw new Error('Revoked');
    const document = materialDocument.parse(a.document), { regeneratePage: _queuedPage, ...settings } = storedMaterialSettings.parse(a.settings);
    await mkdir(join(materialRoot(), a.id), { recursive: true, mode: 0o700 });
    const source = await this.db.materialSource.findUniqueOrThrow({ where: { id: a.sourceId } });
    const images: Record<number,string> = {};
    for (const p of extractedPages.parse(source.pages)) if (p.hasVisual && document.some(d=>d.page===p.page)) images[p.page] = (await visualPage(source.id,p.page,true)).toString('base64');
    await this.pdf(materialPath(a.id, `adapted-${a.revision}.pdf`), documentHtml(document, settings, images));
    const descriptionAudio = settings.supports.includes('image-description') && document.some(page=>page.description.trim());
    const narration = settings.supports.includes('narration');
    const audio = narration || descriptionAudio;
    if (audio) {
      const script = narration ? materialNarration(document) : materialNarration(document.map(({ page, title, description })=>({ page, title, description, text: '' })));
      await this.local('audio', materialPath(a.id, `audio-${a.revision}.mp3`), script);
    }
    if (!await this.permitted(a.versionId, a.creatorId, a.studentId)) throw new Error('Revoked');
    await this.db.materialAdaptation.updateMany({ where: { id: a.id, status: 'rendering', revision: a.revision, expiresAt: { gt: new Date() } }, data: { status: 'ready', hasAudio: audio } });
  }
  async collect() {
    for (const a of await this.db.materialAdaptation.findMany({ where: { expiresAt: { lte: new Date() } }, take: 100 })) { await removeMaterialFiles(a.id); await this.db.materialAdaptation.deleteMany({ where: { id: a.id } }); }
    for (const s of await this.db.materialSource.findMany({ where: { expiresAt: { lte: new Date() }, adaptations: { none: {} } }, take: 100 })) { await removeMaterialFiles(s.id); await this.db.materialSource.deleteMany({ where: { id: s.id } }); }
    // Orphans after DB cascades/rolled-back uploads: remove only UUID directories older than a day.
    await mkdir(materialRoot(), { recursive: true, mode: 0o700 });
    for (const dir of await readdir(materialRoot(), { withFileTypes: true })) {
      if (!dir.isDirectory() || !/^[a-f0-9-]{36}$/.test(dir.name) || Date.now()-(await stat(join(materialRoot(),dir.name))).mtimeMs<86400000) continue;
      if (!await this.db.materialSource.findUnique({ where: { id: dir.name } }) && !await this.db.materialAdaptation.findUnique({ where: { id: dir.name } })) await removeMaterialFiles(dir.name);
    }
  }
}
