"use client";
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { usePreview } from './provider';
import { PreviewHeading,simulatedSave } from './chrome';
import { previewId,publishedMission } from '../../lib/preview/data';
import { PathIllustration } from '../workspace';
export function PreviewHome({role,route}:{role:'aluno'|'professor';route:string}){
 const {state,update}=usePreview(),[name,setName]=useState(''),[invite,setInvite]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{if(role!=='aluno'||route!=='turmas')return;const sync=()=>setInvite(new URLSearchParams(window.location.hash.slice(1)).get('convite')??'');sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[role,route]);
 const student=state.students.find(s=>s.id===state.studentId)!;
 const published=state.missions.flatMap(m=>{const current=publishedMission(m);return current&&state.classrooms.find(c=>c.id===current.classroomId)?.students.includes(student.id)?[current]:[];});
 if(route==='turmas'||role==='professor'&&!route)return <>
  <PreviewHeading title={role==='professor'?'Minhas turmas':'Minhas turmas'} description={role==='professor'?`${state.teacher.name} · professora fictícia`:`${student.name} · ${student.course}`}/>
  {role==='professor'&&<section className="paper teacher-overview"><div><h2>Ensinar também é construir caminhos.</h2><p>Explore uma turma com nomes fictícios, missões publicadas, entregas e pedidos de apoio.</p><Link className="button" href="/previa/professor/missoes/editor">Criar missão</Link></div><PathIllustration variant="teacher"/></section>}
  <div className="preview-card-grid">{state.classrooms.filter(c=>role==='professor'||c.students.includes(student.id)).map(c=><section className="paper form-stack" key={c.id}><p className="eyebrow">{c.subject}</p><h2>{c.name}</h2><p>{c.students.length} alunos fictícios · {state.missions.filter(m=>m.classroomId===c.id).length} missões de exemplo</p>{role==='professor'||published.some(m=>m.classroomId===c.id)?<Link className="button button-outline" href={role==='professor'?'/previa/professor/missoes':`/previa/aluno/missoes/${published.find(m=>m.classroomId===c.id)!.id}`}>Ver missões</Link>:<p className="notice">Ainda não há missões publicadas nesta turma de exemplo.</p>}{role==='professor'&&<><details><summary>Alunos e pedidos compartilhados</summary><ul>{c.students.map(id=>{const s=state.students.find(x=>x.id===id);return s?<li key={id}>{s.name} · {s.shareNeeds&&s.supports.length?'apoios compartilhados':'sem pedido compartilhado'}</li>:null;})}</ul></details><button className="text-button" onClick={()=>{const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const code=c.invitation??Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>alphabet[b & 31]).join('');update(s=>({...s,classrooms:s.classrooms.map(x=>x.id===c.id?{...x,invitation:code}:x)}));setMessage('Convite fictício criado. Ele vale somente no cenário local desta prévia.');}}>Gerar convite de exemplo</button>{c.invitation&&<><p className="notice">Código fictício: <strong>{c.invitation}</strong></p><Link className="text-link" href={`/previa/aluno/turmas#convite=${encodeURIComponent(c.invitation)}`}>Experimentar link fictício de convite</Link><p className="small">No sistema real, você também pode abrir uma mensagem de convite no seu aplicativo de e-mail. Aqui o convite funciona somente neste cenário.</p><button className="text-button" onClick={()=>update(s=>({...s,classrooms:s.classrooms.map(x=>x.id===c.id?{...x,invitation:null}:x)}))}>Revogar convite de exemplo</button></>}</>}</section>)}</div>
  <form className="paper form-stack preview-local-form" onSubmit={e=>{e.preventDefault();if(role==='professor'){if(state.classrooms.length>=10){setMessage('Limite de dez turmas na prévia. Reinicie o cenário para recomeçar.');return;}update(s=>({...s,classrooms:[...s.classrooms,{id:previewId(),name:name.trim(),subject:'Turma de exemplo',students:[],invitation:null}]}));setName('');setMessage('Turma fictícia criada. '+simulatedSave);}else{let code=invite.trim();try{if(/^https?:/.test(code)){const url=new URL(code);code=url.origin===window.location.origin&&url.pathname==='/previa/aluno/turmas'?new URLSearchParams(url.hash.slice(1)).get('convite')??'':'';}}catch{code='';}const c=state.classrooms.find(c=>c.invitation===code.toUpperCase()||c.invitation===code.replace(/[\s-]/g,'').toUpperCase());if(!c){setMessage('Convite fictício não encontrado. Gere um código no espaço do professor.');return;}update(s=>({...s,classrooms:s.classrooms.map(x=>x.id===c.id?{...x,students:[...new Set([...x.students,s.studentId])]}:x)}));setMessage('Entrada simulada na turma. '+simulatedSave);}}}>
   <h2>{role==='professor'?'Criar turma de exemplo':'Entrar em uma turma de exemplo'}</h2><label htmlFor="preview-room-value">{role==='professor'?'Nome da turma':'Código de convite fictício'}</label><input id="preview-room-value" required maxLength={150} value={role==='professor'?name:invite} onChange={e=>role==='professor'?setName(e.target.value):setInvite(e.target.value)}/><button className="button">{role==='professor'?'Criar turma':'Entrar na turma'}</button>
  </form>{message&&<p role="status">{message}</p>}
 </>;
 if(role==='professor')return <><PreviewHeading title="Missões da turma" description="Crie, prepare materiais e confira antes de publicar."/><Link className="button" href="/previa/professor/missoes/editor">Criar missão</Link><ul className="card-list">{state.missions.map(m=><li className="paper" key={m.id}><div><p className="eyebrow">{state.classrooms.find(c=>c.id===m.classroomId)?.name}</p><h2>{m.title}</h2><p>{m.description}</p><p className="small">{m.status==='published'?'Publicada':m.status==='archived'?'Arquivada':'Rascunho'} · versão {m.revision} · exemplo local</p></div><div className="actions"><Link className="button button-outline" href={`/previa/professor/missoes/${m.id}/adaptacoes`}>Preparar materiais</Link><Link className="text-link" href={`/previa/professor/missoes/${m.id}/editor`}>Editar missão</Link><button className="text-button" onClick={()=>{if(window.confirm('Arquivar esta missão fictícia?'))update(s=>({...s,missions:s.missions.map(x=>x.id===m.id?{...x,status:'archived'}:x)}));}}>Arquivar exemplo</button></div></li>)}</ul></>;
 const answerFor=(id:string,revision:number)=>state.submissions.find(s=>s.missionId===id&&s.revision===revision&&s.studentId===student.id);
 const active=published.find(m=>answerFor(m.id,m.revision)?.status==='draft')??published[0];
 const submission=active&&answerFor(active.id,active.revision);
 const otherMissions=published.filter(m=>m.id!==active?.id);
 return <div className="preview-student-home">
  <PreviewHeading title="Um passo de cada vez." description={`Olá, ${student.name.split(' ')[0]}.`}/>
  {active ? <section className="paper preview-student-continue" aria-labelledby="preview-current-mission">
   <p className="eyebrow">{state.classrooms.find(c=>c.id===active.classroomId)?.name}</p>
   <h2 id="preview-current-mission">{active.title}</h2>
   <p>{active.description}</p>
   <p className="small">{submission?.feedback?'Feedback disponível':submission?.status==='submitted'?'Atividade enviada · aguardando feedback':`Etapa ${(submission?.step??0)+1} de ${active.steps.length} · ${active.steps[submission?.step??0]?.title}`}</p>
   <Link className="button" href={`/previa/aluno/missoes/${active.id}`}>{submission?.status==='submitted'?'Consultar atividade':submission?'Continuar minha missão':'Abrir missão'}</Link>
  </section> : <p className="paper">Entre em uma turma fictícia para consultar as missões.</p>}
  {otherMissions.length>0&&<section className="preview-student-other" aria-labelledby="preview-other-missions">
   <h2 id="preview-other-missions">Outras missões</h2>
   <ul className="card-list">{otherMissions.map(m=>{
    const answer=answerFor(m.id,m.revision);
    return <li key={m.id} className="paper">
     <div><h3>{m.title}</h3><p className="small">{answer?.feedback?'Feedback disponível':answer?.status==='submitted'?'Atividade enviada':`${answer?.completed.length??0} de ${m.steps.length} etapas concluídas`}</p></div>
     <Link className="text-link" href={`/previa/aluno/missoes/${m.id}`} aria-label={`Abrir missão: ${m.title}`}>Abrir missão</Link>
    </li>;
   })}</ul>
  </section>}
 </div>;
}
