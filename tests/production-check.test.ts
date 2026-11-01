import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkProduction } from '../scripts/check-production.mjs';
function transport(overrides: Record<string,number>={}){
 const calls:string[]=[];
 const fetcher=async(url:URL,options:RequestInit)=>{
  assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.credentials,'omit');assert.ok(!('Cookie' in (options.headers??{})));
  calls.push(url.pathname);
  const p=url.pathname,status=overrides[p]??(p==='/api/v1/me'||p==='/api/v1/classrooms'?401:200);
  if(p==='/api/v1/health')return Response.json({status:'ok',service:'travessia-api'},{status});
  if(p==='/api/auth/get-session')return Response.json(null,{status});
  const type=p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html';
  return new Response('<html>Travessia<link href="/_next/static/style.css"><script src="/_next/static/app.js"></script></html>',{status,headers:{'Content-Type':type}});
 };
 return {fetcher,calls};
}
test('verificação pública de produção usa apenas GET anônimo e confere os assets do build',async()=>{
 const t=transport(),results=await checkProduction('https://example.invalid',t.fetcher);
 assert.equal(results.length,8);assert.deepEqual(t.calls,['/login','/cadastro','/api/v1/health','/api/v1/me','/api/v1/classrooms','/api/auth/get-session','/_next/static/app.js','/_next/static/style.css']);
});
test('verificação de produção rejeita acesso anônimo indevido e publicação sem arquivo estático',async()=>{
 await assert.rejects(checkProduction('https://example.invalid',transport({'/api/v1/me':200}).fetcher),/esperado HTTP 401/);
 await assert.rejects(checkProduction('https://example.invalid',transport({'/_next/static/app.js':404}).fetcher),/recebido 404/);
 await assert.rejects(checkProduction('https://example.invalid',transport({'/login':302}).fetcher),/recebido 302/);
});
test('verificação de produção exige HTTPS sem credenciais e falha quando a API não responde',async()=>{
 await assert.rejects(checkProduction('http://example.invalid',transport().fetcher),/HTTPS/);
 await assert.rejects(checkProduction('https://user:password@example.invalid',transport().fetcher),/credenciais/);
 await assert.rejects(checkProduction('https://example.invalid',transport({'/api/v1/health':503}).fetcher),/recebido 503/);
});

test('preflight bloqueia falta de recursos antes de qualquer atualização de serviços',{skip:process.platform==='win32'},async()=>{
 const {mkdtempSync,writeFileSync,chmodSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const root=mkdtempSync(join(tmpdir(),'travessia-capacity-'));
 try{
  const mem=join(root,'meminfo');
  for(const [name,body] of [['docker','#!/bin/sh\nprintf "/tmp\\n"\n'],['df','#!/bin/sh\nprintf "Filesystem 1048576-blocks Used Available Capacity Mounted\\nfixture 20000 1000 ${TEST_DISK_MIB} 5%% /tmp\\n"\n']]){const p=join(root,name);writeFileSync(p,body);chmodSync(p,0o700);}
  const run=(memory:number,disk:number)=>{writeFileSync(mem,`MemAvailable: ${memory} kB\n`);return spawnSync('bash',['scripts/check-prod-capacity.sh'],{encoding:'utf8',env:{...process.env,PATH:`${root}:${process.env.PATH}`,TRAVESSIA_MEMINFO:mem,TEST_DISK_MIB:String(disk)}});};
  assert.equal(run(2*1024*1024,5000).status,0);
  assert.equal(run(512*1024,5000).status,1);
  assert.equal(run(2*1024*1024,1000).status,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
