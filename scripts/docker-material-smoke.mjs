import { mkdir, writeFile } from 'node:fs/promises';
import { materialPdfFixture } from './material-fixture.mjs';
export async function materialSmoke(request, check, verifyPersistence) {
  const mission='demo-class-oficina-mission', base=`/api/v1/missions/${mission}`;
  const versionId=(await request(base)).json.publishedVersion.id;
  async function waitFor(read, predicate) {
    for(let i=0;i<90;i++){const value=await read();if(predicate(value))return value;if(value?.status==='failed')throw new Error('Processamento real de material falhou.');await new Promise(r=>setTimeout(r,2000));}
    throw new Error('Worker não concluiu o material no prazo.');
  }
  const list=async()=> (await request(`${base}/material-adaptations?versionId=${versionId}`)).json.items;
  let adaptation, studentCookie;
  if(verifyPersistence){adaptation=(await list()).find(a=>a.document.some(p=>p.title==='Material Docker persistente'));check(adaptation?.status==='released','Material liberado não persistiu.');}
  else {
    const invitation=(await request('/api/v1/classrooms/demo-class-oficina/invitations',{method:'POST',body:{}})).json;
    const signup=await request('/api/auth/sign-up/email',{method:'POST',authenticated:false,body:{name:'Aluno de teste Docker',email:`material-${crypto.randomUUID()}@example.invalid`,password:crypto.randomUUID()+crypto.randomUUID()}});
    studentCookie=signup.response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');check(studentCookie,'Cadastro de teste não iniciou sessão.');
    const studentId=signup.json.user.id;
    await request('/api/v1/invitations/accept',{method:'POST',body:{token:invitation.token},sessionCookie:studentCookie});
    const source=(await request(`${base}/material-sources`,{method:'POST',body:{versionId,title:'PDF Docker',base64:materialPdfFixture(false,4).toString('base64'),requestKey:crypto.randomUUID()}})).json;
    await waitFor(async()=> (await request(`${base}/material-sources?versionId=${versionId}`)).json.items.find(s=>s.id===source.id),s=>s.status==='ready');
    adaptation=(await request(`${base}/material-adaptations`,{method:'POST',body:{versionId,sourceId:source.id,studentId,pages:[1,2,3,4],settings:{supports:['large-print','narration'],fontSize:'22',color:'high',useAi:false,approvedForProvider:false},requestKey:crypto.randomUUID()}})).json;
    adaptation=await waitFor(async()=> (await list()).find(a=>a.id===adaptation.id),a=>a.status==='draft');
    check(adaptation.document.length===4&&adaptation.document.every(p=>p.text.includes('10 meters')),'Extração real perdeu páginas ou conteúdo.');
    check(adaptation.document[3].text.includes('End of page 4.'),'Fim da quarta página ausente.');
    adaptation=(await request(`${base}/material-adaptations/${adaptation.id}`,{method:'PATCH',body:{expectedRevision:adaptation.revision,document:adaptation.document.map((p,i)=>({...p,title:i===0?'Material Docker persistente':`Página ${p.page}`,description:'Um retângulo representa a comparação de rotas.'}))}})).json;
    await request(`${base}/material-adaptations/${adaptation.id}/render`,{method:'POST',body:{expectedRevision:adaptation.revision}});
    adaptation=await waitFor(async()=> (await list()).find(a=>a.id===adaptation.id),a=>a.status==='ready');
    adaptation=(await request(`${base}/material-adaptations/${adaptation.id}/release`,{method:'POST',body:{expectedRevision:adaptation.revision,reviewed:true}})).json;
    check(adaptation.inputTokens===null&&adaptation.outputTokens===null,'Preparação local consumiu IA.');
  }
  for(const kind of ['pdf','audio','page-1']) {
    await request(`${base}/material-assets/${adaptation.id}/${kind}`,{authenticated:false,status:401});
    const response=(await request(`${base}/material-assets/${adaptation.id}/${kind}`)).response;
    const bytes=new Uint8Array(await response.arrayBuffer());check(bytes.length>100,'Artefato real ausente.');
    await mkdir('test-results/materials',{recursive:true});
    await writeFile(`test-results/materials/${kind==='pdf'?'material-adaptado.pdf':kind==='audio'?'material-narrado.mp3':'pagina-original.png'}`,bytes);
    if(kind==='pdf')check(new TextDecoder().decode(bytes.slice(0,5))==='%PDF-','PDF real inválido.');
    if(kind==='audio')check(response.headers.get('content-type')==='audio/mpeg','Narração real ausente.');
    if(studentCookie){const studentResponse=(await request(`${base}/material-assets/${adaptation.id}/${kind}`,{sessionCookie:studentCookie})).response;check((await studentResponse.arrayBuffer()).byteLength===bytes.length,'Aluno não recebeu os mesmos artefatos liberados.');}
  }
  if(studentCookie){const own=(await request(`${base}/my-materials?versionId=${versionId}`,{sessionCookie:studentCookie})).json;check(own.items.some(i=>i.id===adaptation.id),'Material liberado não chegou ao aluno.');await request(`${base}/material-assets/${adaptation.sourceId}/original`,{sessionCookie:studentCookie,status:404});}
  console.log('PDF real extraído, PDF marcado e voz local gerados; revisão, download privado e persistência de materiais verificados.');
}
