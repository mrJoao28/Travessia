"use client";
import { useEffect, useRef, useState } from "react";
import { api, pages, errorMessage, type ApiResponse, type ApiBody } from "../lib/product-client";
import { materialProfiles, materialSupports, type MaterialSupport } from "../lib/material-profiles";
import { TeacherSteps, useTeacherDraftGuard } from "./teacher-steps";
import { materialAssetUrl, PreparedDocument } from "./prepared-material";
import { StudentActivitySupport } from "./student-activity-support";
import { OperationStatus } from "./operation-status";

type Source = ApiResponse<"uploadMaterialSource">;
type Adaptation = ApiResponse<"prepareMaterial">;
type Document = ApiBody<"editMaterial">["document"];
export function IndividualMaterials({ missionId, versionId, classroomId, archived, version, initialFile, onFileReceived, onUnsavedChange }: { missionId: string; versionId: string; classroomId: string; archived: boolean; version?: NonNullable<ApiResponse<"mission">["draftVersion"]>; initialFile?: File | null; onFileReceived?: () => void; onUnsavedChange?: (dirty:boolean)=>void }) {
  const [students, setStudents] = useState<ApiResponse<"strategyRecipients">["items"]>([]);
  const [shared, setShared] = useState<ApiResponse<"sharedLearningNeeds">["items"]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [adaptations, setAdaptations] = useState<Adaptation[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0), [busy, setBusy] = useState(false);
  const [activityOnly,setActivityOnly]=useState(false),[activitySaved,setActivitySaved]=useState(false),[activityDirty,setActivityDirty]=useState(false);
  const [step, setStep] = useState(0), [studentId, setStudentId] = useState("");
  const [profiles, setProfiles] = useState<string[]>([]), [supports, setSupports] = useState<MaterialSupport[]>(["large-print"]);
  const [fontSize, setFontSize] = useState<"18" | "22" | "26">("22"), [color, setColor] = useState<"default" | "high" | "dark">("default");
  const [sourceId, setSourceId] = useState(""), [pageNumbers, setPageNumbers] = useState<number[]>([]), [approved, setApproved] = useState(false);
  const [selectedId, setSelectedId] = useState(""), [document, setDocument] = useState<Document>([]), [dirty, setDirty] = useState(false), [reviewed, setReviewed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const receivedFile = useRef<File | null>(null);
  useEffect(()=>{ if(!loading && initialFile && receivedFile.current!==initialFile){receivedFile.current=initialFile;void upload(initialFile);} },[initialFile,loading]);
  const key = useRef<string | null>(null), uploadKey = useRef<string | null>(null), heading = useRef<HTMLHeadingElement>(null);
  const current = adaptations.find(a => a.id === selectedId), source = sources.find(s=>s.id===sourceId);
  const pending = current && ["queued","generating","rendering"].includes(current.status);
  const ai = supports.some(s=>["literal-language","short-sections","glossary","image-description"].includes(s));
  useTeacherDraftGuard(dirty||activityDirty);
  useEffect(()=>{onUnsavedChange?.(dirty||activityDirty);},[dirty,activityDirty,onUnsavedChange]);
  function change() { key.current = null; setReviewed(false); setError(""); setMessage(""); }
  useEffect(()=>{ heading.current?.focus(); },[step]);
  useEffect(()=>()=>{ if(previewUrl) URL.revokeObjectURL(previewUrl); },[previewUrl]);
  useEffect(()=>{
    let active=true;
    setLoading(true); setError("");
    void Promise.all([pages("strategyRecipients",missionId), pages("sharedLearningNeeds",classroomId), api("materialSources",{params:{id:missionId},query:{versionId}}),api("materialAdaptations",{params:{id:missionId},query:{versionId}})])
      .then(([s,n,f,a])=>{ if(active){setStudents(s);setShared(n);setSources(f.items);setAdaptations(a.items);} })
      .catch(reason=>{if(active)setError(errorMessage(reason));}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[missionId,versionId,classroomId,retry]);
  const waiting = sources.some(s=>["queued","extracting"].includes(s.status)) || adaptations.some(a=>["queued","generating","rendering"].includes(a.status));
  useEffect(()=>{
    if(!waiting)return;
    let cancelled=false; let timer: ReturnType<typeof setTimeout>;
    const poll = async()=>{
      try { const [s,a]=await Promise.all([api("materialSources",{params:{id:missionId},query:{versionId}}),api("materialAdaptations",{params:{id:missionId},query:{versionId}})]);
        if(!cancelled){setSources(s.items);setAdaptations(a.items);setError("");}
      } catch(reason){if(!cancelled)setError(errorMessage(reason));}
      if(!cancelled)timer=setTimeout(()=>{void poll();},4000);
    };
    timer=setTimeout(()=>{void poll();},2000); return ()=>{cancelled=true;clearTimeout(timer);};
  },[waiting,missionId,versionId]);
  useEffect(()=>{
    if(!current || dirty)return;
    setDocument(current.document);
    if(current.status === "ready" || current.status === "released") setStep(3);
  },[current,dirty]);
  async function operation(action:()=>Promise<void>) {setBusy(true);setError("");setMessage("");try{await action();}catch(reason){setError(errorMessage(reason));}finally{setBusy(false);}}
  function update(a:Adaptation) {setAdaptations(old=>[...old.filter(v=>v.id!==a.id),a]);setSelectedId(a.id);setDocument(a.document);setDirty(false);setReviewed(false);}
  async function upload(file: File | undefined) {
    if(!file)return;
    uploadKey.current=crypto.randomUUID();
    await operation(async()=>{
      if(!/\.pdf$/i.test(file.name) || file.size>10*1024*1024 || file.size<8)throw new Error("Escolha um PDF de até 10 MB e 20 páginas, sem senha.");
      const bytes=new Uint8Array(await file.arrayBuffer()); if(new TextDecoder().decode(bytes.slice(0,5))!=="%PDF-")throw new Error("Esse arquivo não é um PDF válido.");
      let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      const result=await api("uploadMaterialSource",{params:{id:missionId},body:{versionId,title:file.name.slice(0,150),base64:btoa(binary),requestKey:uploadKey.current!}});
      setSources(old=>[...old.filter(s=>s.id!==result.id),result]);setSourceId(result.id);onFileReceived?.();setPageNumbers([]);change();setMessage("Arquivo recebido. Aguarde a verificação e extração das páginas.");
    });
  }
  async function prepare() {
    await operation(async()=>{
      if(!studentId || !source || source.status!=="ready" || !pageNumbers.length || !supports.length)throw new Error("Escolha o aluno, o PDF, as páginas e pelo menos um apoio.");
      if(ai&&!approved)throw new Error("Confirme que as páginas selecionadas podem ser enviadas ao Gemini.");
      const a=await api("prepareMaterial",{params:{id:missionId},body:{versionId,sourceId,studentId,pages:pageNumbers,settings:{supports,fontSize,color,useAi:ai,approvedForProvider:ai&&approved},requestKey:key.current??=crypto.randomUUID()}});
      setActivityOnly(false);update(a);setStep(a.status==="ready"||a.status==="released"?3:2);
    });
  }
  async function saveAndRender() {
    if(!current)return;
    await operation(async()=>{
      let a=current;
      if(dirty){a=await api("editMaterial",{params:{id:missionId,adaptationId:a.id},body:{expectedRevision:a.revision,document}});update(a);}
      update(await api("renderMaterial",{params:{id:missionId,adaptationId:a.id},body:{expectedRevision:a.revision}}));
    });
  }
  async function preview() {
    if(!current)return;
    await operation(async()=>{const r=await fetch(materialAssetUrl(missionId,current.id,"pdf"),{cache:"no-store"});if(!r.ok)throw new Error("Não foi possível abrir esta revisão do PDF.");setPreviewUrl(URL.createObjectURL(await r.blob()));});
  }
  const student=students.find(s=>s.id===studentId), declared=shared.find(s=>s.userId===studentId);
  const legacyLabels: Record<string,string> = {visual:"Visual (sem detalhar)",hearing:"Auditiva (sem detalhar)",multiple:"Múltipla",other:"Outra deficiência"};
  const needLabels: Record<string,string> = {"image-description":"descrição das informações visuais",transcript:"transcrição", "clear-instructions":"instruções claras", "short-steps":"passos curtos", "worked-example":"exemplo comentado",glossary:"explicação de termos", "audio-response":"resposta por áudio", "text-file":"arquivo de texto"};
  const labels: Record<string,string> = {queued:"Na fila",extracting:"Verificando PDF",ready:"Pronto para revisar",failed:"Falha no processamento",generating:"Preparando rascunho",draft:"Rascunho para revisão",rendering:"Gerando PDF e áudio",released:"Liberado ao aluno"};
  if(loading)return <p role="status">Carregando alunos e materiais…</p>;
  return <section className="individual-materials form-stack" aria-label="Adaptar material para um aluno">
    <div><p className="eyebrow">Estratégias · Material individual</p><h2 ref={heading} tabIndex={-1}>Prepare o material para este aluno</h2><p>Escolha os apoios, acrescente o PDF e revise o resultado. Só o aluno escolhido recebe a versão liberada.</p></div>
    <TeacherSteps labels={["Aluno e perfil","Material","Revisão","Disponibilizar"]} current={step} onBack={n=>{if((dirty||activityDirty)&&!window.confirm("Descartar os ajustes da atividade ainda não salvos?"))return;setActivityDirty(false);setDirty(false);if(current)setDocument(current.document);setStep(n);setReviewed(false);}} disabled={busy||!!pending}/>
    <OperationStatus message={error||message} error={!!error}/>
    {error && <button className="text-button" onClick={()=>setRetry(n=>n+1)}>Consultar estado salvo novamente</button>}
    {archived ? <p className="notice">Missão arquivada: os materiais podem ser consultados.</p> : <fieldset className="strategy-fields" disabled={busy||!!pending}>
      <legend className="sr-only">Preparar material individual</legend>
      {step===0 && <div className="material-workflow-grid"><section className="paper form-stack">
        <h3>Para quem é este material?</h3><label htmlFor="material-student">Aluno da turma</label><select id="material-student" value={studentId} onChange={e=>{setStudentId(e.target.value);setProfiles([]);change();}}><option value="">Escolha um aluno</option>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
        {!students.length&&<p>Convide um aluno para esta turma antes de preparar um material individual.</p>}
        {studentId && <div className="notice"><strong>Informações compartilhadas pelo aluno</strong><p>{declared ? `Apoios solicitados: ${declared.supports.map(s=>needLabels[s]??s).join(", ") || "nenhum apoio específico"}.` : "Nenhum perfil foi compartilhado nesta turma. Combine os apoios diretamente com o aluno; não é necessário informar deficiência."}</p>{declared?.disabilities?.length ? <p>Perfil informado: {declared.disabilities.map(d=>materialProfiles.find(p=>p.id===d)?.label ?? (legacyLabels[d] ?? d)).join(", ")}</p> : <p className="small">Dados de deficiência não foram compartilhados.</p>}</div>}
        <details><summary>Usar sugestões por perfil informado</summary><p className="small">Selecione apenas o que foi informado voluntariamente. Estas escolhas ajudam a encontrar apoios; não são salvas como diagnóstico e não são enviadas à IA. É possível combinar opções.</p><div className="material-profile-options">{materialProfiles.map(p=><label className="check" key={p.id}><input type="checkbox" checked={profiles.includes(p.id)} onChange={e=>{setProfiles(old=>e.target.checked?[...old,p.id]:old.filter(v=>v!==p.id));change();}}/>{p.label}</label>)}</div>
        <button type="button" className="button button-outline" disabled={!profiles.length} onClick={()=>{setSupports([...new Set(materialProfiles.filter(p=>profiles.includes(p.id)).flatMap(p=>p.supports))]);change();}}>Usar sugestões destes perfis</button></details>
      </section><aside className="paper form-stack material-suggestions"><h3>Que apoio vamos preparar?</h3>{materialProfiles.filter(p=>profiles.includes(p.id)).map(p=><p className="small" key={p.id}><strong>{p.label}: </strong>{p.note}</p>)}
        {materialSupports.map(s=><label className="check material-support-choice" key={s.id}><input type="checkbox" checked={supports.includes(s.id)} onChange={e=>{setSupports(old=>e.target.checked?[...old,s.id]:old.filter(v=>v!==s.id));change();}}/><span><strong>{s.label}</strong><span className="small">{s.hint}</span></span></label>)}
        <details><summary>Ajustar tamanho e cores</summary><div className="form-stack"><label htmlFor="material-font">Tamanho no PDF</label><select id="material-font" value={fontSize} onChange={e=>{setFontSize(e.target.value as typeof fontSize);change();}}><option value="18">18 pontos</option><option value="22">22 pontos</option><option value="26">26 pontos</option></select><label htmlFor="material-color">Cores no PDF</label><select id="material-color" value={color} onChange={e=>{setColor(e.target.value as typeof color);change();}}><option value="default">Azul escuro sobre branco</option><option value="high">Preto sobre branco</option><option value="dark">Branco sobre azul escuro</option></select></div></details>
        <p className="small">Confirme as preferências com o aluno. Os objetivos e critérios da missão são preservados.</p>
      </aside><div className="material-flow-actions"><button className="button" type="button" disabled={!studentId||!supports.length} onClick={()=>{change();setStep(1);}}>Continuar para o material →</button></div></div>}
      {step===1 && <section className="paper form-stack"><h3>Acrescente o material de {student?.name}</h3><p>Envie um PDF de até 10 MB e 20 páginas, sem senha, links ativos ou formulários. O original fica privado para os professores desta turma.</p>
        {initialFile && <p className="notice">PDF escolhido na missão: {initialFile.name}. {error&&<button type="button" className="text-button" onClick={()=>void upload(initialFile)}>Tentar enviar este PDF novamente</button>}</p>}
        <label htmlFor="material-upload">Adicionar arquivo PDF</label><input id="material-upload" type="file" accept="application/pdf,.pdf" onChange={e=>{void upload(e.target.files?.[0]);e.target.value="";}}/>
        <label htmlFor="material-source">Arquivo para adaptar</label><select id="material-source" value={sourceId} onChange={e=>{setSourceId(e.target.value);setPageNumbers([]);change();}}><option value="">Escolha um PDF</option>{sources.map(s=><option value={s.id} key={s.id}>{s.title} · {labels[s.status]}</option>)}</select>
        {source && <><p role="status">{labels[source.status]} · {source.pageCount} páginas</p>{source.warnings.map(w=><p className="small" key={w}>{w}</p>)}{source.status==="ready" && <>
          <a className="text-link" href={materialAssetUrl(missionId,source.id,"original")} download>Baixar original para conferir</a>
          <fieldset className="strategy-fields"><legend>Quais páginas adaptar agora?</legend><p className="small">Até 4 páginas e 12 mil caracteres por vez. Para o restante, prepare outro material. Nenhuma página é cortada automaticamente.</p>{source.pages.map(p=><label className="check" key={p.page}><input type="checkbox" checked={pageNumbers.includes(p.page)} disabled={pageNumbers.length>=4&&!pageNumbers.includes(p.page)} onChange={e=>{setPageNumbers(old=>e.target.checked?[...old,p.page].sort((a,b)=>a-b):old.filter(v=>v!==p.page));change();}}/>Página {p.page} · {p.text.length} caracteres{p.ocr?" · OCR: conferir texto":""}{p.hasVisual?" · informação visual":""}</label>)}</fieldset>
          <details><summary>Conferir texto extraído das páginas selecionadas</summary>{source.pages.filter(p=>pageNumbers.includes(p.page)).map(p=><section key={p.page}><h4>Página {p.page}</h4><p className="submission-content">{p.text||"Sem texto extraído. Confira o original e solicite descrição visual se apropriado."}</p></section>)}</details>
          {ai ? <label className="check"><input type="checkbox" checked={approved} onChange={e=>{setApproved(e.target.checked);change();}}/>Conferi que as páginas não contêm dados pessoais ou conteúdo confidencial e autorizo o envio destas páginas ao Gemini. Para descrever imagens, a IA receberá imagens reais dessas páginas.</label> : <p className="notice">Estes apoios serão preparados localmente, sem chamar o Gemini.</p>}
          <p className="small">O documento é uma fonte de consulta, não uma instrução para a IA. Fórmulas, tabelas e descrições precisam da sua revisão.</p>
          <button type="button" className="button" disabled={!pageNumbers.length||ai&&!approved||source.pages.filter(p=>pageNumbers.includes(p.page)).reduce((n,p)=>n+p.text.length,0)>12000} onClick={()=>void prepare()}>Preparar rascunho para revisão →</button>
        </>}{!["queued","extracting"].includes(source.status)&&<button className="text-button" type="button" onClick={()=>{if(window.confirm("Remover este PDF e retirar todas as adaptações dele dos alunos?"))void operation(async()=>{await api("deleteMaterialSource",{params:{id:missionId,sourceId:source.id}});setSources(old=>old.filter(s=>s.id!==source.id));setAdaptations(old=>old.filter(a=>a.sourceId!==source.id));setSourceId("");});}}>Remover arquivo e suas adaptações</button>}</>}
        <button type="button" className="button button-outline" disabled={!student||!version} onClick={()=>{setActivityOnly(true);setActivitySaved(false);setStep(2);}}>Ajustar somente a atividade e as formas de entrega →</button>
      </section>}
      {step===2 && activityOnly && version && student && <section className="form-stack"><h3>Prepare a atividade para {student.name}</h3><p>Este caminho não precisa de PDF. As instruções e as formas de resposta ficam nesta mesma versão da missão.</p><StudentActivitySupport key={`${versionId}:${studentId}`} missionId={missionId} version={version} studentId={studentId} studentName={student.name} defaultOpen onDirty={setActivityDirty} onSaved={()=>setActivitySaved(true)}/><button type="button" className="button" disabled={!activitySaved||activityDirty} onClick={()=>setStep(3)}>Concluir ajustes deste aluno →</button></section>}
      {step===3 && activityOnly && student && <section className="paper"><h3>Ajustes preparados para {student.name}</h3><p>Os ajustes revisados ficam disponíveis quando esta versão da missão for publicada.</p><button type="button" className="button button-outline" onClick={()=>{setStep(0);setActivityOnly(false);}}>Preparar apoios para outro aluno</button></section>}
      {step===2 && !activityOnly && current && <section className="form-stack"><h3>Revise o conteúdo antes de gerar os arquivos</h3><p>Destinatário: <strong>{student?.name}</strong>. Confira todas as páginas, números, fórmulas e descrições. Não reduza o objetivo avaliado.</p>
        {current.error&&<p role="alert">{current.error}</p>}
        {!!document.length && <div className="material-review-grid"><section className="paper"><h4>Texto do original</h4><a className="text-link" href={materialAssetUrl(missionId,current.sourceId,"original")} download>Baixar PDF original</a>{source?.pages.filter(p=>current.pages.includes(p.page)).map(p=><section key={p.page}><h5>Página {p.page}</h5><p className="submission-content">{p.text}</p></section>)}</section>
          <section className="paper form-stack"><h4>Versão adaptada · editável</h4>{document.map((p,i)=><section className="form-stack" key={p.page}><h5>Página {p.page}</h5><label htmlFor={`material-title-${p.page}`}>Título da página {p.page}</label><input id={`material-title-${p.page}`} maxLength={200} value={p.title} onChange={e=>{setDocument(old=>old.map((v,n)=>n===i?{...v,title:e.target.value}:v));setDirty(true);setReviewed(false);}}/>
            <label htmlFor={`material-text-${p.page}`}>Texto da página {p.page}</label><textarea id={`material-text-${p.page}`} rows={12} maxLength={12000} value={p.text} onChange={e=>{setDocument(old=>old.map((v,n)=>n===i?{...v,text:e.target.value}:v));setDirty(true);setReviewed(false);}}/>
            <label htmlFor={`material-description-${p.page}`}>Descrição das informações visuais da página {p.page}</label><textarea id={`material-description-${p.page}`} rows={5} maxLength={4000} value={p.description} onChange={e=>{setDocument(old=>old.map((v,n)=>n===i?{...v,description:e.target.value}:v));setDirty(true);setReviewed(false);}}/><p className="small">Descreva relações e dados relevantes. Se não houver informação visual relevante, indique isso. Não invente detalhes ilegíveis.</p>
          </section>)}</section></div>}
        {version && student && <StudentActivitySupport key={`${versionId}:${studentId}`} missionId={missionId} version={version} studentId={studentId} studentName={student.name} disabled={archived||!!pending||busy} onDirty={setActivityDirty}/>}
        {!!document.length&&<button className="button" type="button" disabled={activityDirty} onClick={()=>void saveAndRender()}>Salvar revisão e gerar PDF{current.settings.supports.includes("narration")?" e áudio":""} →</button>}
        {current.status==="failed"&&<button className="button button-outline" type="button" onClick={()=>{setSelectedId("");key.current=null;setStep(1);}}>Voltar ao material e conferir</button>}
      </section>}
      {step===3 && !activityOnly && current && <section className="paper form-stack"><h3>{current.status==="released"?"Material liberado":"Confira os arquivos e disponibilize"}</h3><p>Somente <strong>{student?.name}</strong> receberá este material nesta versão da missão, depois de publicada.</p>
        <div className="actions"><button className="button button-outline" type="button" onClick={()=>void preview()}>Abrir prévia do PDF</button><a className="text-link" href={materialAssetUrl(missionId,current.id,"pdf")} download>Baixar PDF adaptado</a></div>
        {previewUrl&&<object className="material-pdf-preview" data={previewUrl} type="application/pdf" aria-label="Prévia do PDF adaptado"><p>Seu navegador não mostra PDFs aqui. Use o link para baixar e conferir.</p></object>}
        {current.hasAudio&&<div className="form-stack"><label htmlFor="material-audio-preview">Ouça a narração e confira a pronúncia</label><audio id="material-audio-preview" controls preload="none" src={materialAssetUrl(missionId,current.id,"audio")}/><a className="text-link" href={materialAssetUrl(missionId,current.id,"audio")} download>Baixar áudio</a></div>}
        <details><summary>Conferir leitura em HTML e transcrição do áudio</summary><PreparedDocument document={current.document} missionId={missionId} adaptationId={current.id}/></details>
        {current.status!=="released"&&<><label className="check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Conferi o PDF, o conteúdo, as descrições e o áudio (quando houver), preservei os objetivos e confirmei o destinatário.</label><button className="button" type="button" disabled={!reviewed||current.status!=="ready"} onClick={()=>void operation(async()=>{update(await api("releaseMaterial",{params:{id:missionId,adaptationId:current.id},body:{expectedRevision:current.revision,reviewed:true}}));setMessage("Material liberado somente para o aluno selecionado. Ele aparecerá na missão publicada.");})}>Disponibilizar para {student?.name} →</button></>}
        <button className="text-button" type="button" onClick={()=>{setStep(2);setReviewed(false);}}>Voltar e editar conteúdo</button>
        <p className="small">Editar o conteúdo retira a versão liberada até uma nova revisão. PDF marcado não é garantia de PDF/UA; a leitura em HTML permanece disponível.</p>
      </section>}
    </fieldset>}
    {pending && <p className="notice" role="status">{labels[current.status]}. Você pode sair desta página e voltar depois. O resultado ficará salvo para revisão; nada será liberado automaticamente.</p>}
    {busy&&<p role="status">Salvando sua solicitação…</p>}
    <section className="form-stack" aria-label="Materiais individuais salvos"><h3>Materiais preparados nesta versão</h3>{!adaptations.length&&<p className="small">Nenhum material individual preparado ainda.</p>}
      {adaptations.map(a=><article className="paper" key={a.id}><h4>{sources.find(s=>s.id===a.sourceId)?.title??"Material"} · {students.find(s=>s.id===a.studentId)?.name??"Aluno sem vínculo ativo"}</h4><p>{labels[a.status]} · Páginas {a.pages.join(", ")}</p><p className="small">Disponível até {new Date(a.expiresAt).toLocaleDateString("pt-BR")}. {a.settings.useAi ? "Rascunho preparado com assistência de IA." : "Preparado localmente."}</p>
        <div className="actions"><button className="button button-outline" type="button" disabled={busy||dirty||a.id===selectedId} onClick={()=>{setSelectedId(a.id);setStudentId(a.studentId);setSourceId(a.sourceId);setSupports(a.settings.supports);setFontSize(a.settings.fontSize);setColor(a.settings.color);setPageNumbers(a.pages);setDocument(a.document);setStep(a.status==="ready"||a.status==="released"?3:2);setReviewed(false);}}>{a.id===selectedId?"Material aberto":"Abrir material"}</button>
        {!archived&&!['queued','generating','rendering'].includes(a.status)&&<button className="text-button" type="button" disabled={busy} onClick={()=>{if(window.confirm("Remover este material e retirar o acesso do aluno?"))void operation(async()=>{await api("removeMaterial",{params:{id:missionId,adaptationId:a.id}});setAdaptations(old=>old.filter(v=>v.id!==a.id));if(a.id===selectedId){setSelectedId("");setStep(0);setDirty(false);}});}}>Remover material</button>}</div>
      </article>)}
    </section>
  </section>;
}
