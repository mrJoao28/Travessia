import { writeFile } from 'node:fs/promises';
import { readConfig } from './config.js';
import { db } from './database.js';
import { MaterialWorker } from './material-worker.js';
const config = readConfig();
const worker = new MaterialWorker(db, config);
let stopping = false;
process.on('SIGTERM', () => { stopping = true; }); process.on('SIGINT', () => { stopping = true; });
const heartbeat = setInterval(() => { void writeFile('/tmp/travessia-worker-heartbeat', String(Date.now())).catch(()=>{}); }, 5000);
await writeFile('/tmp/travessia-worker-heartbeat', String(Date.now()));
let lastCleanup = 0;
try {
  while (!stopping) {
    try {
      if (Date.now()-lastCleanup>3600000) { await worker.collect(); lastCleanup=Date.now(); }
      if (!await worker.tick()) await new Promise(resolve=>setTimeout(resolve, 3000));
    } catch { console.error('Worker de materiais: falha temporária; nenhum conteúdo privado foi registrado.'); await new Promise(resolve=>setTimeout(resolve, 5000)); }
  }
} finally { clearInterval(heartbeat); await db.$disconnect(); }
