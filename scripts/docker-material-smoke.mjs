import { materialPdfFixture } from './material-fixture.mjs';
export async function materialSmoke(request, check, verifyPersistence) {
  const mission='demo-class-oficina-mission', base=`/api/v1/missions/${mission}`;
  const versionId=(await request(base)).json.publishedVersion.id;
  async function waitFor(read, predicate) {
    for(let i=0;i<90;i++){const value=await read();if(predicate(value))return value;if(value?.status==='failed')throw new Error('Processamento real de material falhou.');await new Promise(r=>setTimeout(r,2000));}
    throw new Error('Worker não concluiu o material no prazo.');
  }
  const list=async()=> (await request(`${base}/material-adaptations?versionId=${versionId}`)).json.items;
  let adaptation;
  if(verifyPersistence){adaptation=(await list()).find(a=>a.document.some(p=>p.title==='Material Docker persistente'));check(adaptation?.status==='released','Material liberado não persistiu.');}
  else {
    const studentId=(await request(`${base}/strategy-recipients`)).json.items[0].id;
    const source=(await request(`${base}/material-sources`,{method:'POST',body:{versionId,title:'PDF Docker',base64:materialPdfFixture().toString('base64'),requestKey:crypto.randomUUID()}})).json;
    await waitFor(async()=> (await request(`${base}/material-sources?versionId=${versionId}`)).json.items.find(s=>s.id===source.id),s=>s.status==='ready');
    adaptation=(await request(`${base}/material-adaptations`,{method:'POST',body:{versionId,sourceId:source.id,studentId,pages:[1],settings:{supports:['large-print','narration'],fontSize:'22',color:'high',useAi:false,approvedForProvider:false},requestKey:crypto.randomUUID()}})).json;
    adaptation=await waitFor(async()=> (await list()).find(a=>a.id===adaptation.id),a=>a.status==='draft');
    check(adaptation.document[0].text.includes('10 meters'),'Extração real perdeu o conteúdo.');
    adaptation=(await request(`${base}/material-adaptations/${adaptation.id}`,{method:'PATCH',body:{expectedRevision:adaptation.revision,document:[{...adaptation.document[0],title:'Material Docker persistente',description:'Um retângulo representa a comparação de rotas.'}]}})).json;
    await request(`${base}/material-adaptations/${adaptation.id}/render`,{method:'POST',body:{expectedRevision:adaptation.revision}});
    adaptation=await waitFor(async()=> (await list()).find(a=>a.id===adaptation.id),a=>a.status==='ready');
    adaptation=(await request(`${base}/material-adaptations/${adaptation.id}/release`,{method:'POST',body:{expectedRevision:adaptation.revision,reviewed:true}})).json;
    check(adaptation.inputTokens===null&&adaptation.outputTokens===null,'Preparação local consumiu IA.');
  }
  for(const kind of ['pdf','audio','page-1']) {
    await request(`${base}/material-assets/${adaptation.id}/${kind}`,{authenticated:false,status:401});
    const response=(await request(`${base}/material-assets/${adaptation.id}/${kind}`)).response;
    const bytes=new Uint8Array(await response.arrayBuffer());check(bytes.length>100,'Artefato real ausente.');
    if(kind==='pdf')check(new TextDecoder().decode(bytes.slice(0,5))==='%PDF-','PDF real inválido.');
    if(kind==='audio')check(response.headers.get('content-type')==='audio/mpeg','Narração real ausente.');
  }
  console.log('PDF real extraído, PDF marcado e voz local gerados; revisão, download privado e persistência de materiais verificados.');
}
