"use client";
import Link from 'next/link';
import { useRef,useState } from 'react';
import { usePreview } from './provider';
import { PreviewHeading,simulatedSave } from './chrome';
import { audioTranscript,audioUrl,pdfUrl,previewFiles,presetLabels,previewId,previewDocument,presetSupports,publishedMission } from '../../lib/preview/data';
import { PreparedDocument, materialReadingStyle } from '../prepared-material';
import { useTeacherDraftGuard } from '../teacher-steps';
export function PreviewStudentMission({missionId}:{missionId:string}){
 const {state,update}=usePreview(),student=state.students.find(s=>s.id===state.studentId)!;
 const row=state.missions.find(m=>m.id===missionId),mission=row?publishedMission(row):null;
 const accessible=mission&&state.classrooms.find(c=>c.id===mission.classroomId)?.students.includes(student.id);
 const saved=state.submissions.find(s=>s.missionId===missionId&&s.revision===mission?.revision&&s.studentId===student.id);
 const [index,setIndex]=useState(saved?.step??0),[content,setContent]=useState(saved?.content??''),[completed,setCompleted]=useState<number[]>(saved?.completed??[]),[audio,setAudio]=useState(saved?.audio??false),[textFile,setTextFile]=useState(saved?.textFile??false),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);useTeacherDraftGuard(dirty);
 if(!mission||!accessible)return <><PreviewHeading title="Esta missão ainda não está disponível" description="Rascunhos, versões não publicadas e turmas sem vínculo não aparecem para o aluno neste cenário."/><Link className="button" href="/previa/aluno">Voltar ao meu percurso</Link></>;
 const materials=state.materials.filter(m=>m.missionId===mission.id&&m.revision===mission.revision&&m.studentId===student.id&&m.released);
 const strategies=state.strategies.filter(s=>s.missionId===mission.id&&s.revision===mission.revision&&(!s.studentId||s.studentId===student.id)&&(s.step===null||s.step===index));
 const activity=state.activitySupports?.find(a=>a.missionId===mission.id&&a.revision===mission.revision&&a.studentId===student.id);
 const formats=activity?.formats??[...new Set(['text',...materials.flatMap(m=>m.formats)])];
 const adapted=activity?.instructions??materials.find(m=>m.instructions)?.instructions;
 const step=mission.steps[Math.min(index,mission.steps.length-1)];
 function go(next:number){setIndex(next);setDirty(true);requestAnimationFrame(()=>heading.current?.focus());}
 function save(status:'draft'|'submitted'){
  if(!saved&&state.submissions.length>=100){setMessage('Limite de respostas fictícias atingido. Reinicie o cenário.');return;}
  if(status==='submitted'&&!content.trim()&&!audio&&!textFile){setMessage('Escreva sua resposta ou escolha um anexo fictício autorizado.');return;}
  const answer={id:saved?.id??previewId(),missionId:mission!.id,revision:mission!.revision,studentId:student.id,content:content.trim()||'Resposta em anexo fictício.',completed,step:index,status,audio:formats.includes('audio')&&audio,textFile:formats.includes('text_file')&&textFile,feedback:saved?.feedback??''};
  update(s=>({...s,submissions:[...s.submissions.filter(x=>!(x.missionId===mission!.id&&x.revision===mission!.revision&&x.studentId===student.id)),answer]}));setDirty(false);setMessage(status==='submitted'?'Envio simulado registrado. A professora fictícia pode consultar esta resposta neste navegador.':simulatedSave);
 }
 return <><Link className="text-link" href="/previa/aluno">← Voltar ao meu percurso</Link><PreviewHeading title={mission.title} description={`${student.name} · ${state.classrooms.find(c=>c.id===mission.classroomId)?.name}`}/>
 <div className="preview-student-mission form-stack">
 <section className="paper form-stack preview-student-stage" aria-labelledby="preview-stage-heading">
  <p className="eyebrow">Etapa {index+1} de {mission.steps.length} · {completed.length} concluída(s)</p>
  <h2 id="preview-stage-heading" ref={heading} tabIndex={-1}>{step.title}</h2>
  <p>{adapted || step.instructions}</p>
  {(adapted || step.example || strategies.length>0)&&<details className="example">
   <summary>Exemplo e orientações da etapa</summary>
   {adapted&&<><h3>Enunciado original</h3><p>{step.instructions}</p></>}
   {step.example&&<><h3>Exemplo</h3><p>{step.example}</p></>}
   {strategies.map(s=><div key={s.id}><h3>{s.title}</h3><p className="submission-content">{s.content}</p></div>)}
  </details>}
  <div className="preview-student-stage-actions">
   <label className="check"><input type="checkbox" checked={completed.includes(index)} onChange={e=>{setCompleted(v=>e.target.checked?[...v,index]:v.filter(i=>i!==index));setDirty(true);}}/>Concluí esta etapa</label>
   <div className="actions">
    {index>0&&<button className="text-button" onClick={()=>go(index-1)}>Etapa anterior</button>}
    {index<mission.steps.length-1&&<button className="button button-outline" onClick={()=>go(index+1)}>Próxima etapa</button>}
   </div>
  </div>
 </section>
 <details className="paper preview-student-context">
  <summary>Objetivos e critérios da missão</summary>
  <h2>O que você vai aprender</h2><p className="submission-content">{mission.objectives}</p>
  <h3>Como sua atividade será avaliada</h3><p className="submission-content">{mission.criteria}</p>
 </details>
 {!!materials.length&&<section id="materiais" className="paper form-stack" aria-label="Materiais preparados para você"><h2>Materiais preparados para você</h2>{materials.map(m=><details key={m.id} className="preview-material-item"><summary>{previewFiles[m.source].filename} · {presetLabels[m.preset]}</summary><div className="comparison-paper" data-color={m.preset==='expanded'?'high':undefined}
 style={materialReadingStyle({supports:[...presetSupports[m.preset]],fontSize:m.preset==='expanded'?'22':'18',color:m.preset==='expanded'?'high':'default'})}>
 <PreparedDocument document={previewDocument(m.source,m.preset)}/>
 </div><a className="button button-outline" href={pdfUrl(m.source,m.preset)} download>{m.preset==='original'?'Baixar PDF original':'Baixar PDF preparado'}</a>{m.audio&&<div className="form-stack"><h4>{m.preset==='description'?'Audiodescrição de exemplo':'Trecho narrado do material'}</h4><audio controls preload="none" aria-label={`Ouvir ${previewFiles[m.source].title}`} src={audioUrl(m.preset,m.source)}/><a className="text-link" href={audioUrl(m.preset,m.source)} download>Baixar áudio</a><details><summary>Transcrição do áudio</summary><p className="submission-content">{audioTranscript(m.source,m.preset)}</p><a href={audioUrl(m.preset,m.source).replace('.mp3','.txt')} download>Baixar transcrição</a></details></div>}</details>)}</section>}
 <section className="paper form-stack" data-preview-dirty={dirty}><h2>Sua atividade</h2><label htmlFor="preview-answer">{missionId==='biblioteca'?'Planejamento da solução':'Planejamento e atividade'}</label><textarea id="preview-answer" rows={5} maxLength={20000} value={content} onChange={e=>{setContent(e.target.value);setDirty(true);}}/>
 {formats.includes('audio')&&<div className="form-stack"><label className="check"><input type="checkbox" checked={audio} onChange={e=>{setAudio(e.target.checked);setDirty(true);}}/>Anexar resposta fictícia em áudio</label>{audio&&<><audio controls preload="none" aria-label="Resposta fictícia da atividade" src="/preview/resposta-marina.mp3"/><p className="small">Voz sintética, identificada como resposta fictícia. Nenhum microfone ou arquivo pessoal é enviado.</p></>}</div>}
 {formats.includes('text_file')&&<><label className="check"><input type="checkbox" checked={textFile} onChange={e=>{setTextFile(e.target.checked);setDirty(true);}}/>Anexar arquivo de texto fictício (.txt)</label>{textFile&&<a href="/preview/resposta-exemplo.txt" download>Conferir anexo fictício</a>}</>}
 <div className="actions"><button className="button button-outline" onClick={()=>save('draft')}>Salvar rascunho</button><button className="button" onClick={()=>save('submitted')}>Enviar atividade</button></div>{message&&<p role="status">{message}</p>}<p className="small">Rascunho e envio são simulados neste navegador, sem envio ao servidor.</p><Link className="text-link" href={`/previa/aluno/barreiras?missao=${mission.id}`}>Encontrou uma barreira nesta etapa?</Link></section>
 {saved?.feedback&&<section className="paper"><h2>Feedback da professora</h2><p>{saved.feedback}</p><p className="small">Exemplo de orientação docente, sem nota automática.</p></section>}
 </div>
 </>;
}
