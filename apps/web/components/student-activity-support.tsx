"use client";
import { useEffect, useRef, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
import { useTeacherDraftGuard } from "./teacher-steps";
import { OperationStatus } from "./operation-status";
type Version = NonNullable<ApiResponse<"mission">["draftVersion"]>;
type Plan = ApiResponse<"createAdaptation">;
/** An individual activity adjustment shares the material's student and version. */
export function StudentActivitySupport({ missionId, version, studentId, studentName, disabled = false, defaultOpen=false, onSaved, onDirty }: {
  missionId: string; version: Version; studentId: string; studentName: string; disabled?: boolean; defaultOpen?: boolean; onSaved?: () => void; onDirty?: (value:boolean)=>void;
}) {
  const [plans,setPlans]=useState<Plan[]>([]),[selected,setSelected]=useState<Plan|null>(null);
  const [stepId,setStepId]=useState(version.steps[0]?.id??""),[instructions,setInstructions]=useState(version.steps[0]?.instructions??version.description);
  const [example,setExample]=useState(""),[formats,setFormats]=useState<("text"|"audio"|"text_file")[]>(["text"]);
  const [reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[dirty,setDirty]=useState(false);
  const [message,setMessage]=useState(""),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  const requestKey=useRef<string|null>(null);
  useEffect(()=>{let active=true;setLoaded(false);void api("adaptationPlans",{params:{id:missionId},query:{versionId:version.id}}).then(v=>{if(active){const own=v.items.filter(p=>p.audience==="students"&&p.studentIds.length===1&&p.studentIds[0]===studentId);setPlans(own);const existing=own.find(p=>p.stepId===(version.steps[0]?.id??null));if(existing&&!dirty){setSelected(existing);setInstructions(existing.instructions);setExample(existing.example);setFormats(existing.allowedFormats);}setError("");}}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoaded(true);});return()=>{active=false;};},[missionId,version.id,studentId,retry]);
  useTeacherDraftGuard(dirty);
  function change(){setError("");setDirty(true);onDirty?.(true);setReviewed(false);requestKey.current=null;setMessage("");}
  if(!studentId)return <p>Escolha o aluno antes de ajustar sua atividade.</p>;
  return <details open={defaultOpen||undefined} className="paper form-stack activity-with-material" onToggle={e=>{if(!e.currentTarget.open&&dirty){e.currentTarget.open=true;setError("Salve os ajustes ou mantenha esta seção aberta para preservar seu texto.");}}}>
    <summary>Também ajustar a atividade e as formas de entrega de {studentName}</summary>
    <p>Este ajuste pertence ao mesmo aluno e à mesma versão do material. O enunciado original, os objetivos e os critérios são preservados.</p>
    {!loaded?<p role="status">Consultando ajustes já salvos…</p>:<>
      {error&&<><p role="alert">{error}</p><button type="button" className="text-button" onClick={()=>setRetry(n=>n+1)}>Consultar ajustes novamente</button></>}
      <form className="form-stack" onSubmit={e=>{e.preventDefault();if(!reviewed||busy)return;setBusy(true);setError("");void(async()=>{
        const body={versionId:version.id,stepId:stepId||null,audience:"students" as const,studentIds:[studentId],instructions,example,supportNeeds:[],allowedFormats:formats,reviewed:true as const};
        try{const saved=selected?await api("updateAdaptation",{params:{id:missionId,planId:selected.id},body:{...body,expectedRevision:selected.revision}}):await api("createAdaptation",{params:{id:missionId},body:{...body,requestKey:requestKey.current??=crypto.randomUUID()}});setSelected(saved);setPlans(old=>[...old.filter(p=>p.id!==saved.id),saved]);setDirty(false);onDirty?.(false);onSaved?.();setMessage(`Atividade e formas de entrega salvas para ${studentName}. No rascunho, ficam disponíveis após publicar esta versão.`);}
        catch(e){setError(errorMessage(e));}finally{setBusy(false);}
      })();}}>
        <fieldset className="strategy-fields form-stack" disabled={disabled||busy}>
          <legend>Ajustes individuais da atividade</legend>
          <label htmlFor="material-activity-step">Onde usar estas instruções</label><select id="material-activity-step" value={stepId} onChange={e=>{const id=e.target.value;setStepId(id);if(!dirty){const step=version.steps.find(s=>s.id===id);setInstructions(step?.instructions??version.description);setExample(step?.example??"");}change();}}><option value="">Na missão inteira</option>{version.steps.map(s=><option key={s.id} value={s.id}>{s.position}. {s.title}</option>)}</select>
          <label htmlFor="material-activity-instructions">Instruções preparadas para {studentName}</label><textarea id="material-activity-instructions" required maxLength={6000} rows={5} value={instructions} onChange={e=>{setInstructions(e.target.value);change();}}/>
          <label htmlFor="material-activity-example">Exemplo de apoio (opcional)</label><textarea id="material-activity-example" maxLength={3000} value={example} onChange={e=>{setExample(e.target.value);change();}}/>
          <fieldset className="strategy-fields"><legend>Como este aluno poderá responder</legend><label className="check"><input type="checkbox" checked disabled/>Texto no editor (sempre disponível)</label><label className="check"><input type="checkbox" checked={formats.includes("audio")} onChange={e=>{setFormats(v=>e.target.checked?[...v,"audio"]:v.filter(f=>f!=="audio"));change();}}/>Áudio de até 30 segundos</label><label className="check"><input type="checkbox" checked={formats.includes("text_file")} onChange={e=>{setFormats(v=>e.target.checked?[...v,"text_file"]:v.filter(f=>f!=="text_file"));change();}}/>Arquivo de texto (.txt)</label></fieldset>
          <label className="check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Conferi as instruções e as formas de entrega para {studentName}, preservando o objetivo avaliado.</label>
          {dirty&&<button type="button" className="text-button" onClick={()=>{setInstructions(selected?.instructions??version.steps.find(s=>s.id===stepId)?.instructions??version.description);setExample(selected?.example??"");setFormats(selected?.allowedFormats??["text"]);setDirty(false);onDirty?.(false);setReviewed(false);setError("");}}>Descartar ajustes não salvos</button>}
          <button className="button button-outline" disabled={!reviewed}>{busy?"Salvando ajustes…":"Salvar ajustes da atividade deste aluno"}</button>
        </fieldset>
      </form>
      <OperationStatus message={message}/>
      {!!plans.length&&<section aria-label="Ajustes individuais já salvos"><h4>Ajustes já salvos para {studentName}</h4>{plans.map(p=><article key={p.id}><p>{p.stepId?version.steps.find(s=>s.id===p.stepId)?.title:"Missão inteira"} · {p.allowedFormats.map(f=>({text:"texto",audio:"áudio",text_file:"arquivo de texto"}[f])).join(", ")}</p><button type="button" className="text-button" disabled={busy||disabled} onClick={()=>{if(dirty&&!window.confirm("Descartar os ajustes ainda não salvos?"))return;setSelected(p);setStepId(p.stepId??"");setInstructions(p.instructions);setExample(p.example);setFormats(p.allowedFormats);setDirty(false);onDirty?.(false);setReviewed(false);}}>Revisar este ajuste</button></article>)}</section>}
    </>}
  </details>;
}
