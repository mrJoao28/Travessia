"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ApiResponse } from '../../lib/product-client';
import {
 previewStrategies, audioTranscript, audioUrl, pdfUrl, previewDocument, previewFiles,
 previewPresets, presetSupports, presetLabels, previewId, type ActivitySupport, type Material, type Mission, type Preset,
} from '../../lib/preview/data';
import { MaterialComparison } from '../material-comparison';
import { PreparationProgress } from '../preparation-progress';
import { PreviewHeading } from './chrome';
import { usePreview } from './provider';

const presetDetails: Record<Preset, string> = {
 original: 'Disponibiliza o arquivo de referência.',
 expanded: 'Texto de 22 pt, espaçamento maior e preto sobre branco.',
 clear: 'Linguagem direta e uma lista numerada de ações.',
 glossary: 'Passos numerados e um glossário em seção própria.',
 description: 'Descrição dos elementos visuais em texto e áudio de exemplo.',
};

export function PreviewMaterials({missionId='campus',embedded=false}:{missionId?:string;embedded?:boolean}){
 const {state,update}=usePreview();
 const mission=state.missions.find(m=>m.id===missionId);
 const members=state.classrooms.find(c=>c.id===mission?.classroomId)?.students??[];
 const [studentId,setStudentId]=useState(members.includes(state.studentId)?state.studentId:members[0]??'');
 const [source,setSource]=useState<Mission['source']>(mission?.source??'campus');
 const [selectedPreset,setSelectedPreset]=useState<Preset>();
 const [reviewed,setReviewed]=useState(false);
 const [view,setView]=useState<'original'|'prepared'>('original');
 const [tab,setTab]=useState<'material'|'activity'>('material');
 const [message,setMessage]=useState('');
 const [now,setNow]=useState(Date.now);
 const [strategy,setStrategy]=useState(previewStrategies[0].content);
 const [strategyId,setStrategyId]=useState(previewStrategies[0].id);
 const [strategyAudience,setStrategyAudience]=useState('classroom');
 const [strategyStep,setStrategyStep]=useState('all');

 const student=state.students.find(s=>s.id===studentId);
 const shared=student?.shareNeeds?student.supports:[];
 const suggestion:Preset=shared.includes('large-print')?'expanded':shared.includes('short-steps')?'clear':shared.includes('image-description')?'description':'original';
 const matches=(m:Material)=>m.missionId===mission?.id&&m.revision===mission?.revision&&m.studentId===studentId&&m.source===source;
 const released=state.materials.findLast(m=>matches(m)&&m.released);
 const latest=state.materials.findLast(matches);
 const draft=latest&&!latest.released?latest:undefined;
 const preset=selectedPreset??draft?.preset??released?.preset??suggestion;
 const current=draft?.preset===preset?draft:released?.preset===preset?released:undefined;
 const pending=!!current?.readyAt&&current.readyAt>now;
 useEffect(()=>{
  if(!current?.readyAt||!pending)return;
  const timer=window.setTimeout(()=>setNow(Date.now()),Math.max(0,current.readyAt-Date.now())+20);
  return ()=>window.clearTimeout(timer);
 },[current?.readyAt,pending]);

 if(!mission)return <PreviewHeading title="Missão fictícia não encontrada"/>;
 const archived=mission.status==='archived';
 const originals=previewDocument(source,'original');
 const file=previewFiles[source];
 const sourceView:ApiResponse<'uploadMaterialSource'>={
  id:`preview-source-${source}`,versionId:`preview-version-${mission.revision}`,title:file.filename,
  status:'ready',pageCount:originals.length,pages:originals.map(p=>({page:p.page,text:p.text,hasVisual:p.page===2,ocr:false})),
  warnings:[],expiresAt:'2099-01-01T00:00:00.000Z',
 };
 const document=current&&!pending?previewDocument(source,current.preset):[];
 const adaptation:ApiResponse<'prepareMaterial'>|undefined=current?{
  id:current.id,versionId:sourceView.versionId,sourceId:sourceView.id,studentId:current.studentId,
  mode:current.preset==='original'?'original':'adapted',settings:{
   supports:[...presetSupports[current.preset],...(current.audio&&current.preset!=='description'?['narration' as const]:[])],
   fontSize:current.preset==='expanded'?'22':'18',color:current.preset==='expanded'?'high':'default',useAi:false,approvedForProvider:false,
  },pages:originals.map(p=>p.page),document,status:pending?'rendering':current.released?'released':'ready',
  revision:1,error:null,hasAudio:current.audio,inputTokens:null,outputTokens:null,expiresAt:sourceView.expiresAt,
 }:undefined;

 function resetSelection(){
  setSelectedPreset(undefined);setReviewed(false);setView('original');setMessage('');setNow(Date.now());
 }
 function prepare(){
  if(!student||archived||pending||(!draft&&state.materials.length>=60))return;
  const requestedAt=Date.now();
  const value:Material={id:previewId(),missionId:mission!.id,revision:mission!.revision,studentId,
   source,preset,audio:preset==='description',released:false,instructions:'',formats:['text'],
   readyAt:requestedAt+(preset==='original'?0:1100)};
  update(s=>({...s,materials:[...s.materials.filter(m=>m.id!==draft?.id),value]}));
  setNow(requestedAt);setReviewed(false);setView(preset==='original'?'original':'prepared');setMessage('');
 }
 function release(){
  if(!current||current.released||!reviewed||pending||archived)return;
  update(s=>({...s,materials:s.materials.filter(m=>!matches(m)||m.id===current.id)
   .map(m=>m.id===current.id?{...m,released:true}:m)}));
  setMessage(mission!.status==='draft'?'Material disponibilizado no cenário. O aluno verá após a publicação da missão.':'Material disponibilizado no cenário local.');
 }
 const activity=state.activitySupports?.find(a=>a.missionId===mission.id&&a.revision===mission.revision&&a.studentId===studentId);
 const legacyActivity=state.materials.find(m=>m.missionId===mission.id&&m.revision===mission.revision&&m.studentId===studentId&&m.released);
 const fileControl=<div className="workspace-file-control">
  <span className="pdf-file-badge" aria-hidden="true">PDF</span>
  <select aria-label="Arquivo PDF" value={source} onChange={e=>{setSource(e.target.value as Mission['source']);resetSelection();}}>
   {Object.entries(previewFiles).map(([key,f])=><option key={key} value={key}>{f.filename}</option>)}
  </select>
 </div>;
 const asset=(_id:string,kind:string)=>kind==='original'?pdfUrl(source):kind==='pdf'?pdfUrl(source,preset):kind==='audio'?audioUrl(preset,source):`/preview/${source}-page-${kind.slice(5)}.png`;

 return <section className="simple-material-preparation material-comparison-workspace form-stack" aria-label="Preparar material fictício">
  {!embedded&&<PreviewHeading title="Adaptar material" description={`${mission.title} · versão ${mission.revision} · ${mission.status==='published'?'publicada':'rascunho'}`}/>}
  <p className="notice">Use os PDFs fictícios para testar o fluxo. O processamento e a IA são simulados neste navegador.</p>
  <div className="material-reference-desk">
   <aside className="material-reference-settings" aria-label="Preparação e revisão do material">
    <div className="simple-student-context">
     <label htmlFor="preview-material-student">Aluno da turma</label>
     <select id="preview-material-student" value={studentId} onChange={e=>{setStudentId(e.target.value);resetSelection();}}>
      <option value="">Escolha um aluno</option>{state.students.filter(s=>members.includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
     </select>
     <p className="small">{shared.length?'O aluno compartilhou pedidos de apoio neste cenário.':'Nenhum pedido compartilhado neste cenário. Você ainda pode selecionar um apoio.'}</p>
    </div>
    <div className="material-workspace-switch" role="group" aria-label="Área de apoio">
     <button type="button" aria-pressed={tab==='material'} onClick={()=>setTab('material')}>Material</button>
     <button type="button" aria-pressed={tab==='activity'} disabled={!student} onClick={()=>setTab('activity')}>Atividade e entrega</button>
    </div>
    {tab==='activity'&&student?<PreviewActivity key={`${mission.id}:${mission.revision}:${studentId}`} initial={activity??legacyActivity} disabled={archived}
     onSave={fields=>{
      const items=state.activitySupports??[];
      if(!activity&&items.length>=60){setMessage('Limite de ajustes da prévia atingido.');return;}
      update(s=>({...s,activitySupports:[...(s.activitySupports??[]).filter(a=>!(a.missionId===mission.id&&a.revision===mission.revision&&a.studentId===studentId)),{missionId:mission.id,revision:mission.revision,studentId,...fields}]}));
      setMessage('Atividade e formas de entrega salvas no cenário local.');
     }}/>:<div className="material-workspace-settings-content form-stack">
     <fieldset className="strategy-fields form-stack" disabled={!student||archived||pending}>
      <legend>Apoios para o material</legend>
      <p className="small">Nesta prévia, escolha um dos exemplos preparados para comparar o resultado.</p>
      {previewPresets.map(option=><label className="check preview-preset" key={option}>
       <input type="radio" name="preview-material-preset" checked={preset===option} onChange={()=>{setSelectedPreset(option);setReviewed(false);setMessage('');setView('original');}}/>
       <span><strong>{presetLabels[option]}</strong><span className="small">{presetDetails[option]}{option===suggestion&&suggestion!=='original'?' · Sugerido para este aluno':''}</span></span>
      </label>)}
     </fieldset>
     <p className="small">{file.filename} · {sourceView.pageCount} páginas do original</p>
     {released&&!current?.released&&<p className="notice">O aluno continua com o material anterior até você disponibilizar esta revisão.</p>}
     {pending?<PreparationProgress title="Preparando prévia de exemplo" detail={`${presetLabels[preset]} · ${sourceView.pageCount} páginas em ${Math.ceil(sourceView.pageCount/4)} lote(s) simulado(s).`}/>:<>
      {!current||current.released?<button type="button" className="button" disabled={!student||archived||(!draft&&state.materials.length>=60)} onClick={prepare}>{current?.released?'Preparar outra revisão de exemplo':'Gerar prévia de exemplo'}</button>:null}
      {current&&<>
       <h3>{current.released?'Material disponibilizado':'Confira a prévia'}</h3>
       <a className="text-link" href={pdfUrl(source,preset)} download>{preset==='original'?'Baixar PDF original':'Baixar PDF preparado'}</a>
       {current.audio&&<details><summary>Transcrição do áudio fictício</summary><p className="submission-content">{audioTranscript(source,preset)}</p><a href={audioUrl(preset,source).replace('.mp3','.txt')} download>Baixar transcrição</a></details>}
       {!current.released&&<><label className="check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Conferi o material e o destinatário.</label><button type="button" className="button" disabled={!reviewed||archived} onClick={release}>Disponibilizar para {student?.name}</button></>}
       {current.released&&<Link className="text-link" href={`/previa/aluno/missoes/${mission.id}`} onClick={()=>update(s=>({...s,studentId}))}>Ver como {student?.name}</Link>}
      </>}
     </>}
    </div>}
    {message&&<p role="status">{message}</p>}
   </aside>
   <MaterialComparison missionId={mission.id} source={sourceView} adaptation={adaptation} studentName={student?.name}
    originalOnly={preset==='original'} document={document} dirty={false} view={view} onViewChange={setView}
    assetUrl={asset} illustrative singleView fileControl={fileControl}/>
  </div>
  <details className="paper material-extra-tools"><summary>Outros apoios da missão</summary><div className="form-stack"><h3>Orientações e estratégias</h3><p className="small">Exemplos editáveis. Confira a adequação ao material, sem alterar objetivos ou critérios.</p><label htmlFor="preview-strategy-kind">Tipo de apoio</label><select id="preview-strategy-kind" value={strategyId} onChange={e=>{setStrategyId(e.target.value);setStrategy(previewStrategies.find(v=>v.id===e.target.value)!.content);}}>{previewStrategies.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select><label htmlFor="preview-strategy-audience">Quem recebe esta orientação</label><select id="preview-strategy-audience" value={strategyAudience} onChange={e=>setStrategyAudience(e.target.value)}><option value="classroom">Turma inteira</option><option value="student">Aluno selecionado acima</option></select><label htmlFor="preview-strategy-stage">Onde mostrar o apoio</label><select id="preview-strategy-stage" value={strategyStep} onChange={e=>setStrategyStep(e.target.value)}><option value="all">Em toda a missão</option>{mission.steps.map((v,i)=><option key={i} value={i}>{v.title}</option>)}</select><label htmlFor="preview-strategy-text">Texto do apoio</label><textarea id="preview-strategy-text" maxLength={6000} value={strategy} onChange={e=>setStrategy(e.target.value)}/><button className="button button-outline" disabled={!strategy.trim()||state.strategies.length>=60||strategyAudience==='student'&&!student} onClick={()=>{update(s=>({...s,strategies:[...s.strategies,{id:previewId(),missionId:mission.id,revision:mission.revision,studentId:strategyAudience==='classroom'?null:studentId,step:strategyStep==='all'?null:Number(strategyStep),title:previewStrategies.find(v=>v.id===strategyId)!.title,content:strategy}]}));setMessage('Orientação salva na simulação local.');}}>Salvar orientação de exemplo</button><ul>{state.strategies.filter(v=>v.missionId===mission.id&&v.revision===mission.revision).map(v=><li key={v.id}>{v.title} · {v.studentId?state.students.find(s=>s.id===v.studentId)?.name:'turma inteira'} · {v.step===null?'toda a missão':mission.steps[v.step]?.title}<button className="text-button" aria-label={`Remover ${v.title} para ${v.studentId?state.students.find(s=>s.id===v.studentId)?.name:'turma inteira'}`} onClick={()=>update(s=>({...s,strategies:s.strategies.filter(x=>x.id!==v.id)}))}>Remover</button></li>)}</ul></div></details>
 </section>;
}

function PreviewActivity({initial,disabled,onSave}:{initial?:ActivitySupport;disabled:boolean;onSave:(fields:Pick<ActivitySupport,'instructions'|'formats'>)=>void}){
 const [instructions,setInstructions]=useState(initial?.instructions??'');
 const [formats,setFormats]=useState<ActivitySupport['formats']>(initial?.formats??['text']);
 const [reviewed,setReviewed]=useState(false);
 return <fieldset className="form-stack strategy-fields" disabled={disabled}>
  <legend>Ajustes da atividade</legend>
  <label htmlFor="preview-adapted-instruction">Instruções para este aluno</label>
  <textarea id="preview-adapted-instruction" maxLength={6000} value={instructions} onChange={e=>{setInstructions(e.target.value);setReviewed(false);}}/>
  <button type="button" className="text-button" onClick={()=>{setInstructions('Consulte os dados do material. Anote duas evidências e explique sua decisão em uma resposta curta.');setReviewed(false);}}>Gerar orientação · IA simulada</button>
  <fieldset className="strategy-fields"><legend>Como o aluno pode responder</legend>{(['audio','text_file'] as const).map(format=><label className="check" key={format}><input type="checkbox" checked={formats.includes(format)} onChange={e=>{setFormats(value=>e.target.checked?[...value,format]:value.filter(f=>f!==format));setReviewed(false);}}/>{format==='audio'?'Áudio de exemplo':'Arquivo de texto (.txt)'}</label>)}</fieldset>
  <label className="check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Conferi as instruções e as formas de entrega.</label>
  <button type="button" className="button" disabled={!reviewed} onClick={()=>{onSave({instructions,formats});setReviewed(false);}}>Salvar ajustes da atividade</button>
 </fieldset>;
}
