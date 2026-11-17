import { rename, rm, writeFile } from 'node:fs/promises';
import { readConfig } from './config.js';
import { db } from './database.js';
import { MaterialWorker } from './material-worker.js';
const config = readConfig();
const worker = new MaterialWorker(db, config);
let stopping = false;
process.on('SIGTERM', () => { stopping = true; }); process.on('SIGINT', () => { stopping = true; });
const healthPath = '/tmp/travessia-worker-heartbeat';
await rm(healthPath, { force: true });
async function markProgress(budgetMs = 30_000) {
  await writeFile(healthPath + '.tmp', String(Date.now() + budgetMs));
  await rename(healthPath + '.tmp', healthPath);
}
let lastCleanup = 0;
try {
  while (!stopping) {
    try {
      if (Date.now()-lastCleanup>3600000) { await markProgress(120_000); await worker.collect(); lastCleanup=Date.now(); }
      const worked = await worker.tick(markProgress);
      await markProgress();
      if (!worked) await new Promise(resolve=>setTimeout(resolve, 3000));
    } catch { console.error('Worker de materiais: falha temporária; nenhum conteúdo privado foi registrado.'); await new Promise(resolve=>setTimeout(resolve, 5000)); }
  }
} finally { await db.$disconnect(); }
