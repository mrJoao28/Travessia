import { pathToFileURL } from 'node:url';

/** Read-only public checks: no account creation, login, personal data or demo seed. */
export async function checkProduction(baseUrl='https://travessia.maisacessoconecta.com.br', fetcher=fetch) {
 const base=new URL(baseUrl);
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error('Informe apenas uma origem HTTPS pública, sem credenciais.');
 const results=[];
 async function get(path,status){
  const r=await fetcher(new URL(path,base),{method:'GET',redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(20000),headers:{Accept:path.includes('/api/')?'application/json':'*/*'}});
  if(r.status!==status)throw new Error(`${path}: esperado HTTP ${status}, recebido ${r.status}.`);
  results.push({path,status:r.status});return r;
 }
 const login=await get('/login',200),html=await login.text();
 if(!login.headers.get('content-type')?.includes('text/html')||!html.toLowerCase().includes('travessia'))throw new Error('/login: conteúdo da aplicação não encontrado.');
 const registration=await get('/cadastro',200);
 if(!registration.headers.get('content-type')?.includes('text/html'))throw new Error('/cadastro: página HTML indisponível.');
 const health=await(await get('/api/v1/health',200)).json();
 if(health?.status!=='ok'||health?.service!=='travessia-api')throw new Error('/api/v1/health: API não está pronta.');
 await get('/api/v1/me',401);await get('/api/v1/classrooms',401);
 if(await(await get('/api/auth/get-session',200)).json()!==null)throw new Error('Consulta anônima retornou sessão inesperada.');
 const assets=[...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+\.(?:js|css))"/g)].map(m=>m[1]))];
 for(const extension of ['.js','.css']){
  const path=assets.find(p=>p.endsWith(extension));if(!path)throw new Error(`Asset ${extension} não encontrado no HTML de login.`);
  const r=await get(path,200),expected=extension==='.css'?'text/css':'javascript';
  if(!r.headers.get('content-type')?.includes(expected))throw new Error(`Asset ${extension} retornou conteúdo inválido.`);
  await r.body?.cancel();
 }
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{for(const r of await checkProduction(process.env.TRAVESSIA_PUBLIC_URL))console.log(`OK ${r.path}: HTTP ${r.status}`);}
 catch(error){console.error(`Verificação de produção falhou: ${error instanceof Error?error.message:'Falha de conexão HTTPS.'}`);process.exitCode=1;}
}
