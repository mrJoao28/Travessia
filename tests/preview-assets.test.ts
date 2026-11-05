import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialPreview,pdfUrl,audioUrl,audioTranscript,previewDocument,previewFiles,publishedMission,missionVersion} from '../apps/web/lib/preview/data.ts';
const read=(path:string)=>readFileSync(new URL('../apps/web/public'+path,import.meta.url));
test('todas as combinações públicas de PDF, áudio e transcrição têm arquivos fictícios consistentes',()=>{
 for(const source of Object.keys(previewFiles) as (keyof typeof previewFiles)[]){
  for(const page of previewDocument(source,'original')){
   assert.equal(read(`/preview/${source}-page-${page.page}.png`).subarray(1,4).toString(),'PNG');
  }
  assert.ok(previewDocument(source,'glossary').some(page=>page.steps?.length&&page.glossary?.length));
  assert.ok(previewDocument(source,'description').some(page=>page.description.length>0));
  for(const preset of ['original','expanded','clear','glossary','description'] as const){
   assert.equal(read(pdfUrl(source,preset)).subarray(0,5).toString(),'%PDF-');
   assert.ok(read(audioUrl(preset,source)).length>10000);
   assert.equal(read(audioUrl(preset,source).replace('.mp3','.txt')).toString().trim(),audioTranscript(source,preset));
  }
 }
});
test('rascunho não substitui a versão publicada e arquivamento retira a missão do percurso',()=>{
 const m=initialPreview().missions[0];
 const draft={...m,title:'Texto ainda não publicado',revision:2,status:'draft' as const,publishedVersion:missionVersion(m)};
 assert.equal(publishedMission(draft)?.title,m.title);assert.equal(publishedMission(draft)?.revision,1);
 assert.equal(publishedMission({...draft,status:'archived'}),null);
 assert.equal(publishedMission(initialPreview().missions.find(m=>m.id==='informacao')!),null);
});
