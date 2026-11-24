"use client";
import Link from 'next/link';
import { useEffect,useLayoutEffect,useRef,useState } from 'react';
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
 const [index,setIndex]=useState(saved?.step??0),[content,setContent]=useState(saved?.content??''),[completed,setCompleted]=useState<number[]>(saved?.completed??[]),[audio,setAudio]=useState(saved?.audio??false),[textFile,setTextFile]=useState(saved?.textFile??false),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false),[confirmSubmit,setConfirmSubmit]=useState(false);
 const [started,setStarted]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 const submitConfirmation=useRef<HTMLDivElement>(null);
 const finalizeButton=useRef<HTMLButtonElement>(null);
 const stepNavigation=useRef(false);
 useTeacherDraftGuard(dirty);
 useLayoutEffect(()=>{
  if(!started&&!stepNavigation.current)return;
  if(started&&!stepNavigation.current){heading.current?.focus({preventScroll:true});return;}
  stepNavigation.current=false;
  heading.current?.focus({preventScroll:true});
 },[index]);
 useEffect(()=>{if(confirmSubmit)submitConfirmation.current?.focus();},[confirmSubmit]);
 if(!mission||!accessible)return <><PreviewHeading title="Esta atividade ainda não está disponível" description="Rascunhos, versões não publicadas e turmas sem vínculo não aparecem para o aluno neste cenário."/><Link className="button" href="/previa/aluno">Voltar ao meu percurso</Link></>;
 const materials=state.materials.filter(m=>m.missionId===mission.id&&m.revision===mission.revision&&m.studentId===student.id&&m.released);
 const activityStrategies=state.strategies.filter(s=>s.missionId===mission.id&&s.revision===mission.revision&&(!s.studentId||s.studentId===student.id));
 const activity=state.activitySupports?.find(a=>a.missionId===mission.id&&a.revision===mission.revision&&a.studentId===student.id);
 const formats=activity?.formats??[...new Set(['text',...materials.flatMap(m=>m.formats)])];
 const adapted=activity?.instructions??materials.find(m=>m.instructions)?.instructions;
 const step=mission.steps[Math.min(index,mission.steps.length-1)];
 function go(next:number){stepNavigation.current=true;setIndex(next);setDirty(true);}
 function save(status:'draft'|'submitted'){
  if(!saved&&state.submissions.length>=100){setMessage('Limite de respostas fictícias atingido. Reinicie o cenário.');return false;}
  if(status==='submitted'&&!content.trim()&&!audio&&!textFile){setMessage('Escreva sua resposta ou escolha um anexo fictício autorizado.');return false;}
  const answer={id:saved?.id??previewId(),missionId:mission!.id,revision:mission!.revision,studentId:student.id,content:content.trim()||'Resposta em anexo fictício.',completed,step:index,status,audio:formats.includes('audio')&&audio,textFile:formats.includes('text_file')&&textFile,feedback:saved?.feedback??''};
  update(s=>({...s,submissions:[...s.submissions.filter(x=>!(x.missionId===mission!.id&&x.revision===mission!.revision&&x.studentId===student.id)),answer]}));setDirty(false);setMessage(status==='submitted'?'Envio simulado registrado. A professora fictícia pode consultar esta resposta neste navegador.':simulatedSave);return true;
 }
 function saveAndAdvance(){if(index>=mission!.steps.length-1)return;if(save('draft')){go(index+1);setMessage(`Etapa ${index+2} de ${mission!.steps.length}.`);}}
 function dismissSubmitConfirmation(){setConfirmSubmit(false);requestAnimationFrame(()=>finalizeButton.current?.focus());}
 return <><Link className="text-link" href="/previa/aluno">← Voltar ao meu percurso</Link><PreviewHeading title={mission.title} description={started?`${student.name} · ${state.classrooms.find(c=>c.id===mission.classroomId)?.name}`:mission.description}/>
 <div className="preview-student-mission form-stack">
 {!started ? <section className="paper form-stack" aria-label="Apresentação da atividade">
  <details id="materiais" className="preview-student-context"><summary>Abrir materiais, PDFs e apoios</summary><p>{previewFiles[mission.source].filename}</p><a className="text-link" href={pdfUrl(mission.source,'original')} download>Baixar PDF da atividade</a>{!!materials.length&&<section aria-label="PDFs e materiais da atividade"><div className="form-stack">{materials.map(m=><details key={m.id} className="preview-material-item"><summary>{previewFiles[m.source].filename} · {presetLabels[m.preset]}</summary><div className="comparison-paper" data-color={m.preset==='expanded'?'high':undefined} style={materialReadingStyle({supports:[...presetSupports[m.preset]],fontSize:m.preset==='expanded'?'22':'18',color:m.preset==='expanded'?'high':'default'})}><PreparedDocument document={previewDocument(m.source,m.preset)}/></div><a className="button button-outline" href={pdfUrl(m.source,m.preset)} download>{m.preset==='original'?'Baixar PDF original':'Baixar PDF preparado'}</a>{m.audio&&<><audio controls preload="none" aria-label={`Ouvir ${previewFiles[m.source].title}`} src={audioUrl(m.preset,m.source)}/><details><summary>Transcrição do áudio</summary><p className="submission-content">{audioTranscript(m.source,m.preset)}</p><a href={audioUrl(m.preset,m.source).replace('.mp3','.txt')} download>Baixar transcrição</a></details></>}</details>)}</div></section>}{!!activityStrategies.length&&<section aria-label="Apoios da atividade"><h3>Apoios da atividade</h3>{activityStrategies.map(s=><article className="example" key={s.id}><h4>{s.title}</h4><p className="small">{s.step===null?'Para toda a atividade':mission.steps[s.step]?.title??'Atividade específica'}</p><p className="submission-content">{s.content}</p></article>)}</section>}</details>
  <details className="preview-student-context"><summary>Objetivos e critérios da atividade</summary><h2>O que você vai aprender</h2><p className="submission-content">{mission.objectives}</p><h3>Como sua atividade será avaliada</h3><p className="submission-content">{mission.criteria}</p></details>
  <button type="button" className="button" onClick={()=>setStarted(true)}>{saved?.status==='draft'?'Continuar atividade':saved?'Consultar atividade':'Clique aqui para iniciar'}</button>
 </section> : <>
 <section className="paper form-stack preview-student-stage" aria-labelledby="preview-stage-heading">
 <nav className="student-step-pagination" aria-label="Navegação das etapas">
   <button type="button" className="button button-outline" aria-label="Etapa anterior" disabled={index===0} onClick={()=>go(index-1)}>Anterior</button>
  <div className="student-stage-indicator">
   <span id="preview-current-stage-label">Etapa {index+1} de {mission.steps.length}</span>
   <div className="student-stage-progress-track" role="progressbar" aria-labelledby="preview-current-stage-label" aria-valuemin={1} aria-valuemax={mission.steps.length} aria-valuenow={index+1} aria-valuetext={`Etapa ${index+1} de ${mission.steps.length}`}><span style={{width:`${((index+1)/mission.steps.length)*100}%`}}/></div>
  </div>
 </nav>
  <h2 id="preview-stage-heading" ref={heading} tabIndex={-1}><strong>Título da atividade:</strong> {step.title}</h2>
  <p><strong>Descrição da atividade: </strong>{adapted || step.instructions}</p>
  {(adapted || step.example || activityStrategies.length>0)&&<details className="example" key={index}>
   <summary>Exemplo e orientações da etapa</summary>
   {adapted&&<><h3>Enunciado original</h3><p>{step.instructions}</p></>}
   {step.example&&<><h3>Exemplo</h3><p>{step.example}</p></>}
   {activityStrategies.map(s=><div key={s.id}><h3>{s.title}</h3><p className="submission-content">{s.content}</p></div>)}
  </details>}
 </section>
 <section className="paper form-stack" data-preview-dirty={dirty}><h2>Sua atividade</h2><label htmlFor="preview-answer">Escreva a sua resposta</label><textarea id="preview-answer" rows={5} maxLength={20000} value={content} onChange={e=>{setContent(e.target.value);setDirty(true);}}/>
 {formats.includes('audio')&&<div className="form-stack"><label className="check"><input type="checkbox" checked={audio} onChange={e=>{setAudio(e.target.checked);setDirty(true);}}/>Anexar resposta fictícia em áudio</label>{audio&&<><audio controls preload="none" aria-label="Resposta fictícia da atividade" src="/preview/resposta-marina.mp3"/><p className="small">Voz sintética, identificada como resposta fictícia. Nenhum microfone ou arquivo pessoal é enviado.</p></>}</div>}
 {formats.includes('text_file')&&<><label className="check"><input type="checkbox" checked={textFile} onChange={e=>{setTextFile(e.target.checked);setDirty(true);}}/>Anexar arquivo de texto fictício (.txt)</label>{textFile&&<a href="/preview/resposta-exemplo.txt" download>Conferir anexo fictício</a>}</>}
 <p className="submission-stage-guidance">{index===mission.steps.length-1?'Você chegou à última etapa. Revise suas respostas antes de enviar a atividade para o professor.':'Ao avançar, esta etapa será salva como rascunho. Você só enviará a atividade quando chegar à última etapa.'}</p>
 <div className="actions submission-actions"><button type="button" className="button button-outline" onClick={()=>save('draft')}>Salvar rascunho</button>{index===mission.steps.length-1?<button ref={finalizeButton} type="button" className="button submission-finalize-button" onClick={()=>setConfirmSubmit(true)}>Finalizar e enviar atividade</button>:<button type="button" className="button submission-advance-button" onClick={saveAndAdvance}>Salvar e avançar para a etapa {index+2}</button>}</div>
 {confirmSubmit&&<div className="notice submission-confirmation" role="group" aria-labelledby="preview-submit-confirmation-title" tabIndex={-1} ref={submitConfirmation} onKeyDown={event=>{if(event.key==='Escape')dismissSubmitConfirmation();}}><h3 id="preview-submit-confirmation-title">Enviar atividade para revisão?</h3><p>Esta prévia registra apenas uma entrega fictícia neste navegador. Nenhum dado será enviado ao servidor.</p><div className="actions"><button type="button" className="button button-outline" onClick={dismissSubmitConfirmation}>Continuar revisando</button><button type="button" className="button" onClick={()=>{if(save('submitted'))setConfirmSubmit(false);}}>Confirmar envio fictício</button></div></div>}
 {message&&<p role="status">{message}</p>}<p className="small">Rascunho e envio são simulados neste navegador, sem envio ao servidor.</p><Link className="text-link" href={`/previa/aluno/barreiras?atividade=${mission.id}`}>Encontrou uma barreira nesta etapa?</Link></section>
 {saved?.feedback&&<section className="paper"><h2>Feedback da professora</h2><p>{saved.feedback}</p><p className="small">Exemplo de orientação docente, sem nota automática.</p></section>}
 </> }
 </div>
 </>;
}
