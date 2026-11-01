import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { MaterialAdaptation, MaterialSource, PrismaClient } from '@prisma/client';
import { chromium } from 'playwright-core';
import { z } from 'zod';
import type { Config } from './config.js';
import { serial } from './database.js';
import { materialDocument, materialSettings } from './material-contracts.js';
import { checkDiskBudget, materialPath, materialRoot, removeMaterialFiles, visualPage } from './material-files.js';
import { extractedPages } from './materials.js';
import { materialProvider, type MaterialProvider } from './material-provider.js';

const tools = fileURLToPath(new URL('../material-tools/process.py', import.meta.url));
export async function localProcess(mode: 'extract' | 'audio', path: string, input = ''): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.MATERIAL_PYTHON ?? 'python3', [tools, mode, path], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, OMP_NUM_THREADS: '1' } });
    const chunks: Buffer[] = []; let size = 0; let ended = false;
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, 240000);
    child.stdout.on('data', (v: Buffer) => { size += v.length; if (size > 2 * 1024 * 1024) child.kill('SIGKILL'); else chunks.push(v); });
    child.stderr.resume(); // Never log parser errors: they can contain private file content.
    child.on('error', () => { clearTimeout(timer); if (!ended) { ended = true; reject(new Error('Local processor unavailable')); } });
    child.on('close', code => { clearTimeout(timer); if (ended) return; ended = true;
      if (code !== 0 || size > 2 * 1024 * 1024) return reject(new Error('Local processing failed'));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Invalid processor result')); }
    });
    child.stdin.on('error', () => {}); child.stdin.end(input);
  });
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function documentHtml(document: z.infer<typeof materialDocument>, settings: z.infer<typeof materialSettings>, images: Record<number,string> = {}) {
  const colors = settings.color === 'dark' ? ['#fff','#173651'] : settings.color === 'high' ? ['#000','#fff'] : ['#173651','#fff'];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Material adaptado</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;font-size:${settings.supports.includes('large-print') ? settings.fontSize : '18'}pt;line-height:${settings.supports.includes('wide-spacing') ? '1.8' : '1.5'};color:${colors[0]};background:${colors[1]};overflow-wrap:anywhere}section{break-before:page}section:first-of-type{break-before:auto}h1{font-size:1.4em}h2{font-size:1.15em;break-after:avoid}p{white-space:pre-wrap}footer{font-size:12pt}</style></head><body><h1>Material adaptado</h1><p>Versão preparada e revisada pelo professor. Consulte também o material original e os objetivos da missão.</p>${document.map(p=>`<section><h2>${escapeHtml(p.title)}</h2><p>Referência: página ${p.page} do original</p><p>${escapeHtml(p.text)}</p>${images[p.page] ? `<figure><img style="max-width:100%;height:auto" alt="${escapeHtml(p.description || 'Página original: conferir informação visual com o texto e o professor.')}" src="data:image/png;base64,${images[p.page]}"><figcaption>Referência visual da página ${p.page}. Use zoom para ampliar.</figcaption></figure>` : ''}${p.description ? `<h3>Descrição das informações visuais</h3><p>${escapeHtml(p.description)}</p>` : ''}</section>`).join('')}<footer>Leitura em HTML e transcrição também disponíveis no Travessia.</footer></body></html>`;
}
export async function renderPdf(path: string, html: string) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort()); // No network/file requests or model-supplied URLs.
    const page = await context.newPage(); await page.setContent(html, { timeout: 15000 });
    await page.pdf({ path, format: 'A4', printBackground: true, tagged: true, outline: true });
  } finally { await browser.close(); }
}
const instructions: Record<string,string> = {
  'literal-language': 'Usar linguagem literal e direta, explicar expressões figuradas sem perder precisão.',
  'short-sections': 'Organizar em seções curtas e previsíveis, uma ação por bloco, sem omitir conteúdo.',
  glossary: 'Explicar termos técnicos no contexto, mantendo o termo original.',
  'image-description': 'Descrever relações, informações e dados relevantes das imagens recebidas, indicando incerteza.',
};
export class MaterialWorker {
  constructor(readonly db: PrismaClient, readonly config: Config, readonly provider: MaterialProvider = materialProvider(config),
    readonly local = localProcess, readonly pdf = renderPdf) {}
  async permitted(versionId: string, creatorId: string, studentId?: string) {
    return !!await this.db.missionVersion.findFirst({ where: { id: versionId, mission: { status: { not: 'archived' },
      OR: [{ draftVersionId: versionId }, { publishedVersionId: versionId }], classroom: { memberships: { some: { userId: creatorId, role: 'teacher', active: true } },
        ...(studentId ? { AND: [{ memberships: { some: { userId: studentId, role: 'student', active: true } } }] } : {}) } } } });
  }
  async tick() {
    const stale = new Date(Date.now()- 6*60000);
    // An abandoned external call is marked failed, never retried automatically (unknown provider charge).
    await this.db.materialSource.updateMany({ where: { status: 'extracting', startedAt: { lt: stale } }, data: { status: 'failed', warnings: ['Processamento interrompido. Envie novamente após conferir o arquivo.'] } });
    await this.db.materialAdaptation.updateMany({ where: { status: { in: ['generating','rendering'] }, startedAt: { lt: stale } }, data: { status: 'failed', error: 'Processamento interrompido. Nenhuma nova chamada IA foi realizada.' } });
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
    } catch {
      if (job.type === 'source') await this.db.materialSource.updateMany({ where: { id: job.row.id, status: 'extracting' }, data: { status: 'failed', warnings: ['Não foi possível verificar o PDF. Use até 20 páginas, sem senha, formulários, anexos, links ou scripts.'] } });
      else await this.db.materialAdaptation.updateMany({ where: { id: job.row.id, status: { in: ['generating','rendering'] } }, data: { status: job.row.status === 'rendering' ? 'draft' : 'failed', error: 'Não foi possível preparar esta revisão. Confira o conteúdo e a configuração. Nenhum arquivo foi liberado.', hasAudio: false } });
    }
    return true;
  }
  async extract(source: MaterialSource) {
    if (!await this.permitted(source.versionId, source.creatorId)) throw new Error('Revoked');
    const result = z.strictObject({ pages: extractedPages.min(1), warnings: z.array(z.string().max(500)).max(30) }).parse(await this.local('extract', materialPath(source.id, 'original.pdf')));
    if (!await this.permitted(source.versionId, source.creatorId)) throw new Error('Revoked');
    await this.db.materialSource.updateMany({ where: { id: source.id, status: 'extracting', expiresAt: { gt: new Date() } }, data: { status: 'ready', pages: result.pages, warnings: result.warnings, pageCount: result.pages.length } });
  }
  async prepare(a: MaterialAdaptation) {
    if (!await this.permitted(a.versionId, a.creatorId, a.studentId)) throw new Error('Revoked');
    const source = await this.db.materialSource.findFirstOrThrow({ where: { id: a.sourceId, status: 'ready', expiresAt: { gt: new Date() } } });
    const settings = materialSettings.parse(a.settings), selected = z.array(z.number()).parse(a.pages);
    const pages = extractedPages.parse(source.pages).filter(p => selected.includes(p.page));
    if (pages.length !== selected.length || pages.reduce((n,p)=>n+p.text.length,0)>12000) throw new Error('Input budget');
    let document: unknown = pages.map(p => ({ page: p.page, title: `Página ${p.page}`, text: p.text, description: '' }));
    let inputTokens: number | undefined, outputTokens: number | undefined;
    if (settings.useAi) {
      if (!this.config.aiEnabled || !settings.approvedForProvider) throw new Error('Disabled');
      const version = await this.db.missionVersion.findUniqueOrThrow({ where: { id: a.versionId }, select: { objectives: true } });
      const input = { objectives: z.array(z.string()).parse(version.objectives), supports: settings.supports.filter(s=>instructions[s]).map(s=>instructions[s]),
        pages: await Promise.all(pages.map(async p => ({ page: p.page, text: p.text, ...(settings.supports.includes('image-description') ? { image: await visualPage(source.id, p.page) } : {}) }))) };
      if (input.pages.some(p=>p.image && p.image.length>2*1024*1024)) throw new Error('Image budget');
      const generated = await this.provider(input, AbortSignal.timeout(45000)); document = generated.document; inputTokens = generated.inputTokens; outputTokens = generated.outputTokens;
    }
    const parsed = materialDocument.parse(document);
    if (JSON.stringify(parsed.map(p=>p.page))!==JSON.stringify(selected) || parsed.reduce((n,p)=>n+p.text.length+p.description.length,0)>20000) throw new Error('Output budget');
    if (!await this.permitted(a.versionId, a.creatorId, a.studentId)) throw new Error('Revoked');
    await this.db.materialAdaptation.updateMany({ where: { id: a.id, status: 'generating', expiresAt: { gt: new Date() } }, data: { document: parsed, status: 'draft', inputTokens, outputTokens } });
  }
  async render(a: MaterialAdaptation) {
    if (!await this.permitted(a.versionId, a.creatorId, a.studentId)) throw new Error('Revoked');
    const document = materialDocument.parse(a.document), settings = materialSettings.parse(a.settings);
    await mkdir(join(materialRoot(), a.id), { recursive: true, mode: 0o700 });
    const source = await this.db.materialSource.findUniqueOrThrow({ where: { id: a.sourceId } });
    const images: Record<number,string> = {};
    for (const p of extractedPages.parse(source.pages)) if (p.hasVisual && document.some(d=>d.page===p.page)) images[p.page] = (await visualPage(source.id,p.page)).toString('base64');
    await this.pdf(materialPath(a.id, `adapted-${a.revision}.pdf`), documentHtml(document, settings, images));
    const audio = settings.supports.includes('narration');
    if (audio) await this.local('audio', materialPath(a.id, `audio-${a.revision}.mp3`), document.map(p=>`${p.title}. Página ${p.page} do original.\n${p.text}\n${p.description ? 'Descrição das informações visuais. '+p.description : ''}`).join('\n\n'));
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
