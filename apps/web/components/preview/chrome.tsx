"use client";
import Link from 'next/link';
import { usePreview } from './provider';
export function PreviewChrome({role}:{role:'aluno'|'professor'}){
 const {state,update,reset,storageWarning}=usePreview();
 return <section className="preview-scenario-toolbar" aria-label="Cenário fictício">
  <div><strong>Prévia interativa · dados fictícios</strong><p>Simulação neste navegador. Sem sessão real, envio ao servidor ou chamadas de IA. Use somente conteúdo fictício.</p></div>
  <div className="actions"><Link className="text-link" href={`/previa/${role}/primeiros-passos`}>Primeiros passos</Link><Link className="text-link" href={`/previa/${role==='aluno'?'professor':'aluno'}`}>Ver como {role==='aluno'?'professor':'aluno'}</Link><button className="text-button" type="button" onClick={()=>{if(window.confirm('Reiniciar somente os dados fictícios desta prévia?'))reset();}}>Reiniciar cenário</button></div>
  {role==='aluno'?<div className="preview-persona"><label htmlFor="preview-student-persona">Aluno fictício</label><select id="preview-student-persona" value={state.studentId} onChange={e=>{if(document.querySelector('[data-preview-dirty="true"]')&&!window.confirm('Há alterações ainda não salvas. Trocar o aluno fictício e descartar essas alterações?'))return;const id=e.target.value;update(s=>({...s,studentId:id}));}}>{state.students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>:<p className="small">Professora fictícia: {state.teacher.name} · {state.teacher.subject}</p>}
  {storageWarning&&<p role="status">O navegador não permitiu salvar a prévia localmente. O cenário funciona nesta sessão, mas pode reiniciar ao recarregar.</p>}
 </section>;
}
export function PreviewHeading({title,description}:{title:string;description?:string}){return <header className="page-heading"><h1>{title}</h1>{description&&<p>{description}</p>}</header>;}
export const simulatedSave='Esta prévia não envia dados ao servidor. Alterações simuladas salvas somente neste navegador.';
