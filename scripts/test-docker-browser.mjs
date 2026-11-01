import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
const env=parseEnv(readFileSync('.env.docker','utf8'));
if(env.DEMO_MODE!=='true'||env.DEMO_ONLY!=='true'||!['localhost','127.0.0.1'].includes(new URL(env.APP_PUBLIC_ORIGIN).hostname))throw new Error('Teste permitido somente no Docker local e isolado de demonstração.');
await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/playwright/cli.js','test','--config','apps/web/playwright.docker.config.mjs'],{stdio:'inherit',env:{...process.env,TRAVESSIA_WEB_TEST_URL:env.APP_PUBLIC_ORIGIN}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Fluxo completo Docker falhou; nenhuma credencial foi impressa.')));});
