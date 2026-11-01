"use client";
import { useEffect, useRef, useState } from "react";
import { api, pages, errorMessage, type ApiResponse, type ApiBody } from "../lib/product-client";
import { materialProfiles, type MaterialSupport } from "../lib/material-profiles";
import { materialSuggestions } from "../lib/material-suggestions";
import { useTeacherDraftGuard } from "./teacher-steps";
import { materialAssetUrl, PreparedDocument } from "./prepared-material";
import { StudentActivitySupport } from "./student-activity-support";
import { MaterialComparison } from "./material-comparison";
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
  const [delivery,setDelivery]=useState<"original"|"adapted">("original");
  const [supports, setSupports] = useState<MaterialSupport[]>([]);
  const [editText,setEditText]=useState(false);
  const [readerView,setReaderView]=useState<'original'|'prepared'>('prepared');
  const autoRender=useRef<string|null>(null);
  const [fontSize, setFontSize] = useState<"18" | "22" | "26">("22"), [color, setColor] = useState<"default" | "high" | "dark">("default");
  const [sourceId, setSourceId] = useState(""), [pageNumbers, setPageNumbers] = useState<number[]>([]), [approved, setApproved] = useState(false);
  const [selectedId, setSelectedId] = useState(""), [document, setDocument] = useState<Document>([]), [dirty, setDirty] = useState(false), [reviewed, setReviewed] = useState(false);

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
  useEffect(()=>{if(current?.status==='draft'&&autoRender.current===current.id&&!dirty){autoRender.current=null;void saveAndRender();}},[current,dirty]);
  useEffect(()=>{if(source?.status==='ready'&&!selectedId){const all=source.pages;setPageNumbers(all.length<=4&&all.reduce((n,p)=>n+p.text.length,0)<=12000?all.map(p=>p.page):[]);}},[source?.id,source?.status]);
  useEffect(()=>{setReviewed(false);},[step,selectedId]);
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
      setSources(old=>[...old.filter(s=>s.id!==result.id),result]);setSelectedId('');setDocument([]);setSourceId(result.id);setStep(0);onFileReceived?.();setPageNumbers([]);change();setMessage("Arquivo recebido. Aguarde a verificação e extração das páginas.");
    });
  }
  async function prepare() {
    await operation(async()=>{
      if(!studentId || !source || source.status!=="ready" || !pageNumbers.length || !supports.length)throw new Error("Escolha o aluno, o PDF, as páginas e pelo menos um apoio.");
      if(ai&&!approved)throw new Error("Confirme que as páginas selecionadas podem ser enviadas ao Gemini.");
      const a=await api("prepareMaterial",{params:{id:missionId},body:{versionId,sourceId,studentId,pages:pageNumbers,settings:{supports,fontSize,color,useAi:ai,approvedForProvider:ai&&approved},requestKey:key.current??=crypto.randomUUID()}});
      setActivityOnly(false);if(!["ready","released"].includes(a.status))autoRender.current=a.id;update(a);setStep(a.status==="ready"||a.status==="released"?3:2);
    });
  }
  async function saveAndRender() {
    if(!current)return;
    await operation(async()=>{
      let a=current;
      if(dirty){a=await api("editMaterial",{params:{id:missionId,adaptationId:a.id},body:{expectedRevision:a.revision,document}});update(a);}
      const rendered=await api("renderMaterial",{params:{id:missionId,adaptationId:a.id},body:{expectedRevision:a.revision}});update(rendered);setStep(rendered.status==="ready"?3:2);
    });
  }
  const student=students.find(s=>s.id===studentId), declared=shared.find(s=>s.userId===studentId);
  const suggestions=materialSuggestions(declared?.disabilities,declared?.supports);
  const supportLabels: Record<MaterialSupport,{label:string;hint:string}> = {
    'large-print':{label:'Texto ampliado',hint:'Aumentar o tamanho do texto para facilitar a leitura.'},
    'wide-spacing':{label:'Mais espaço entre linhas',hint:'Dar mais espaço aos parágrafos e à leitura.'},
    'high-contrast':{label:'Contraste de leitura',hint:'Manter boa distinção entre texto e fundo.'},
    'literal-language':{label:'Explicação mais direta',hint:'Usar frases claras e explicar expressões figuradas.'},
    'short-sections':{label:'Passos curtos e numerados',hint:'Apresentar uma ação por vez, em uma sequência clara.'},
    glossary:{label:'Explicar termos do material',hint:'Acrescentar explicações junto aos termos importantes.'},
    'image-description':{label:'Descrição das imagens',hint:'Descrever as informações visuais das páginas escolhidas.'},
    narration:{label:'Áudio com transcrição',hint:'Oferecer uma versão para ouvir, com o texto disponível.'},
  };
  function chooseStudent(id:string){
    const needs=shared.find(s=>s.userId===id), next=materialSuggestions(needs?.disabilities,needs?.supports);
    setStudentId(id);setSupports(next.selected);setDelivery(next.selected.length?'adapted':'original');setSelectedId('');setDocument([]);setDirty(false);setActivityDirty(false);setActivityOnly(false);setEditText(false);setApproved(false);change();
  }
  function toggle(id:MaterialSupport,checked:boolean){setSupports(old=>checked?[...new Set([...old,id])]:old.filter(s=>s!==id));setApproved(false);change();}
  function option(id:MaterialSupport){return <label className="simple-support-option" key={id}><input type="checkbox" checked={supports.includes(id)} onChange={e=>toggle(id,e.target.checked)}/><span><strong>{supportLabels[id].label}</strong><span className="small">{supportLabels[id].hint}</span></span></label>;}
  const labels:Record<string,string>={queued:'Na fila',extracting:'Verificando PDF',ready:'Pronto para conferir',failed:'Não foi possível preparar',generating:'Preparando conteúdo',draft:'Rascunho salvo',rendering:'Preparando PDF e áudio',released:'Disponibilizado'};
  async function sendOriginal(){await operation(async()=>{if(!source||source.status!=='ready'||!reviewed)return;const a=await api('releaseOriginalMaterial',{params:{id:missionId},body:{versionId,sourceId,studentId,requestKey:key.current??=crypto.randomUUID(),reviewed:true}});update(a);setMessage(`PDF original disponibilizado para ${student?.name}. Na versão em rascunho, ficará visível após a publicação.`);});}
  const locked=busy||!!pending||dirty||activityDirty;
  function chooseSource(id:string){setSourceId(id);setSelectedId('');setDocument([]);setEditText(false);setActivityOnly(false);setStep(studentId?1:0);setApproved(false);change();}
  function activityChanged(value:boolean){setActivityDirty(value);if(value)setReviewed(false);}
  const fileRow=source?<div className="comparison-selected-file"><span className="pdf-file-badge" aria-hidden="true">PDF</span><div><strong>{source.title}</strong><p className="small">{source.status==='ready'?`Arquivo adicionado · ${source.pageCount} ${source.pageCount===1?'página':'páginas'}`:labels[source.status]}</p></div></div>:null;
  if(loading)return <p role="status">Carregando alunos e materiais…</p>;
  const released=!!current&&current.status==='released'&&current.studentId===studentId;
  return <section className="simple-material-preparation material-comparison-workspace form-stack" aria-label="Preparar material individual">
    <header><h2 ref={heading} tabIndex={-1}>{student?(step===3?`Conferir material de ${student.name}`:`Prepare o material para ${student.name}`):'Preparar material para um aluno'}</h2><p>{step===3?'Compare o original, confira a leitura preparada e disponibilize para o aluno.':'Selecione o arquivo e prepare uma versão para o aluno, sem sair desta tela.'}</p></header>
    {(error||message)&&<OperationStatus message={error||message} error={!!error}/>}
    {error&&<button className="text-button" type="button" onClick={()=>setRetry(n=>n+1)}>Consultar estado salvo</button>}
    {step>0&&student&&<div className="simple-student-context"><div><strong>{student.name}</strong><p className="small">{declared?.disabilities?.length?declared.disabilities.map(d=>materialProfiles.find(p=>p.id===d)?.label??({visual:'Visual (sem detalhar)',hearing:'Auditiva (sem detalhar)',other:'Outra deficiência',multiple:'Múltipla'} as Record<string,string>)[d]??d).join(' · ')+' · informação compartilhada pelo aluno':'Nenhuma deficiência informada'}</p></div><button type="button" className="text-button" disabled={busy||!!pending} onClick={()=>{if((dirty||activityDirty)&&!window.confirm('Descartar as alterações ainda não salvas?'))return;setDirty(false);setActivityDirty(false);setStep(0);}}>Alterar aluno</button></div>}
    <div className="material-desk">
      <aside className="material-files-panel paper form-stack" aria-label="Arquivos da missão">
        <h3>Arquivos</h3>
        {!archived&&<div className="material-upload-control"><label htmlFor="material-upload">Adicionar arquivo PDF</label><input id="material-upload" className="sr-only" type="file" accept="application/pdf,.pdf" disabled={locked} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></div>}
        <p className="small">PDF de até 10 MB e 20 páginas.</p>
        {sources.length?<><ul className="material-source-list">{sources.map(s=><li key={s.id}><button type="button" className="material-source-button" aria-pressed={s.id===sourceId} disabled={locked} onClick={()=>chooseSource(s.id)}><span className="pdf-file-badge" aria-hidden="true">PDF</span><span><strong>{s.title}</strong><span className="small">{labels[s.status]}</span></span></button></li>)}</ul></>:<p className="small">Adicione o material que deseja preparar.</p>}
        {current&&<nav className="material-file-outputs" aria-label="Versões do arquivo"><button type="button" className="text-button" onClick={()=>setReaderView('original')}>PDF original</button>{delivery!=='original'&&<button type="button" className="text-button" onClick={()=>setReaderView('prepared')}>Leitura preparada</button>}{current.hasAudio&&<a href="#material-audio">Áudio do material</a>}</nav>}
        <p className="small">Os arquivos são privados. O aluno recebe apenas a versão que você disponibilizar.</p>
      </aside>
      <MaterialComparison missionId={missionId} source={source} adaptation={current} studentName={student?.name} originalOnly={delivery==='original'} document={document} dirty={dirty} view={readerView} onViewChange={setReaderView}/>
      <aside className="material-controls-panel" aria-label="Preparação e revisão do material">
    {archived?<p className="notice">Missão arquivada. Consulte os materiais salvos abaixo.</p>:<>
      {step===0&&<section className="paper form-stack">
        <label htmlFor="material-student">Aluno da turma</label><select id="material-student" value={studentId} disabled={busy} onChange={e=>chooseStudent(e.target.value)}><option value="">Escolha um aluno</option>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
        {fileRow}{source?.status==='failed'&&source.warnings.map(w=><p role="alert" key={w}>{w}</p>)}
        {version&&student&&<button className="text-button" type="button" disabled={busy} onClick={()=>{setActivityOnly(true);setActivitySaved(false);setStep(2);}}>Ajustar atividade sem PDF</button>}
        <div className="simple-material-actions"><button className="button" type="button" disabled={!student||source?.status!=='ready'||busy} onClick={()=>{setActivityOnly(false);setStep(1);change();}}>Continuar →</button></div>
      </section>}
      {step===1&&source&&<section className="paper form-stack">
        <h3>Como deseja disponibilizar?</h3>
        <fieldset className="strategy-fields simple-delivery-choice" disabled={busy}><legend className="sr-only">Versão do material</legend>
          <label className={`simple-choice${delivery==='original'?' selected':''}`}><input type="radio" name="material-delivery" checked={delivery==='original'} onChange={()=>{setDelivery('original');setApproved(false);change();}}/><span><strong>Manter o PDF original</strong><span className="small">Disponibilizar o arquivo sem alterações.</span></span></label>
          <label className={`simple-choice${delivery==='adapted'?' selected':''}`}><input type="radio" name="material-delivery" checked={delivery==='adapted'} onChange={()=>{setDelivery('adapted');change();}}/><span><strong>Preparar uma versão com apoio</strong><span className="small">Facilitar a leitura, oferecer áudio ou organizar a explicação.</span></span></label>
        </fieldset>
        {delivery==='original'?<p className="small">Qualquer aluno pode receber apoio, sem informar deficiência. Você pode manter o original ou preparar outra versão quando necessário.</p>:<>
          <h3>O que vamos preparar para {student?.name}?</h3><p className="small">Sugestões para você confirmar. Os objetivos e o conteúdo serão preservados.</p>
          <fieldset className="strategy-fields" disabled={busy}><legend className="sr-only">Apoios para confirmar</legend>
            {suggestions.primary.length?suggestions.primary.map(option):<>
              {([{label:'Facilitar a leitura',hint:'Ampliar o texto e dar mais espaço à leitura.',ids:['large-print','wide-spacing']},{label:'Ouvir o material',hint:'Preparar áudio com transcrição.',ids:['narration']},{label:'Organizar a explicação',hint:'Usar linguagem direta e blocos menores.',ids:['literal-language','short-sections']}] as {label:string;hint:string;ids:MaterialSupport[]}[]).map(c=><label className="simple-support-option" key={c.label}><input type="checkbox" checked={c.ids.every(id=>supports.includes(id))} onChange={e=>{setSupports(old=>e.target.checked?[...new Set([...old,...c.ids])]:old.filter(id=>!c.ids.includes(id)));setApproved(false);change();}}/><span><strong>{c.label}</strong><span className="small">{c.hint}</span></span></label>)}
            </>}
          </fieldset>
          <details className="simple-more-options"><summary>Outras opções</summary><div className="form-stack">
            {(suggestions.primary.length?suggestions.extra:['high-contrast','glossary','image-description'] as MaterialSupport[]).map(option)}
            {(supports.includes('large-print')||supports.includes('high-contrast'))&&<><label htmlFor="material-font">Tamanho do texto</label><select id="material-font" value={fontSize} onChange={e=>{setFontSize(e.target.value as typeof fontSize);change();}}><option value="18">Grande · 18 pontos</option><option value="22">Grande · 22 pontos</option><option value="26">Muito grande · 26 pontos</option></select><label htmlFor="material-color">Cores de leitura</label><select id="material-color" value={color} onChange={e=>{setColor(e.target.value as typeof color);change();}}><option value="default">Escuro sobre claro</option><option value="high">Preto sobre branco</option><option value="dark">Claro sobre escuro</option></select></>}
          </div></details>
          <details open={source.pageCount>4||!pageNumbers.length?true:undefined}><summary>Páginas da prévia · {pageNumbers.length} de {source.pageCount}</summary><p className="small">Até 4 páginas e 12 mil caracteres por adaptação. As demais páginas não serão incluídas nesta versão; prepare-as separadamente.</p>{source.pages.map(p=><label className="check" key={p.page}><input type="checkbox" checked={pageNumbers.includes(p.page)} disabled={pageNumbers.length>=4&&!pageNumbers.includes(p.page)} onChange={e=>{setPageNumbers(old=>e.target.checked?[...old,p.page].sort((a,b)=>a-b):old.filter(v=>v!==p.page));change();}}/>Página {p.page} · {p.text.length} caracteres{p.ocr?' · texto reconhecido automaticamente':''}</label>)}</details>
          {ai&&<label className="check"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/>Conferi as páginas e os objetivos e autorizo enviar esse conteúdo didático, sem dados pessoais, ao Gemini para preparar o rascunho.</label>}
          <p className="small">Confirme as preferências com o aluno. Você confere a prévia antes de enviar.</p>
        </>}
        <div className="simple-material-actions"><button className="text-button" type="button" disabled={busy} onClick={()=>setStep(0)}>← Voltar</button><button className="button" type="button" disabled={busy||delivery==='adapted'&&(!supports.length||!pageNumbers.length||ai&&!approved||source.pages.filter(p=>pageNumbers.includes(p.page)).reduce((n,p)=>n+p.text.length,0)>12000)} onClick={()=>{if(delivery==='original'){setSelectedId('');setStep(3);}else void prepare();}}>{delivery==='original'?'Continuar →':'Preparar prévia →'}</button></div>
      </section>}
      {step===2&&activityOnly&&version&&student&&<section className="form-stack"><StudentActivitySupport key={`${versionId}:${studentId}`} missionId={missionId} version={version} studentId={studentId} studentName={student.name} defaultOpen onDirty={activityChanged} onSaved={()=>setActivitySaved(true)}/><button type="button" className="button" disabled={!activitySaved||activityDirty} onClick={()=>setStep(3)}>Concluir ajustes deste aluno →</button></section>}
      {step===3&&activityOnly&&student&&<section className="paper"><h3>Ajustes preparados para {student.name}</h3><p>Os ajustes revisados acompanham a versão publicada da missão.</p><button type="button" className="button button-outline" onClick={()=>{setStep(0);setActivityOnly(false);}}>Preparar outro material</button></section>}
      {step===2&&!activityOnly&&<section className="paper form-stack"><h3>Preparando a prévia</h3><p role="status">{current?labels[current.status]:'Consultando a preparação…'}. O resultado fica salvo para sua revisão.</p>{current?.error&&<p role="alert">{current.error}</p>}{current?.status==='draft'&&!pending&&<button type="button" className="button" disabled={busy} onClick={()=>void saveAndRender()}>Preparar prévia deste rascunho</button>}{current?.status==='failed'&&<button className="button button-outline" onClick={()=>{setSelectedId('');setStep(1);}}>Voltar aos apoios</button>}</section>}
      {step===3&&!activityOnly&&student&&<section className="paper form-stack">
        <h3>{released?'Material disponibilizado':delivery==='original'?'Confira o PDF original':'Confira a prévia'}</h3><p>Destinatário: <strong>{student.name}</strong>. {delivery==='original'?'O PDF será mantido sem alterações.':'Confira a leitura, as descrições e a pronúncia do áudio, quando houver.'}</p>
        {delivery==='adapted'&&current&&<ul className="material-applied-supports" aria-label="Apoios aplicados">{current.settings.supports.map(id=><li key={id}><span aria-hidden="true">✓</span>{supportLabels[id].label}</li>)}</ul>}
        {!dirty&&<a className="text-link" href={delivery==='original'?materialAssetUrl(missionId,sourceId,'original'):materialAssetUrl(missionId,current!.id,'pdf')} target="_blank" rel="noopener noreferrer">{delivery==='original'?'Conferir PDF original':'Conferir PDF gerado'}</a>}
        {!dirty&&<a className="text-link" href={delivery==='original'?materialAssetUrl(missionId,sourceId,'original'):materialAssetUrl(missionId,current!.id,'pdf')} download>{delivery==='original'?'Baixar PDF original para conferir':'Baixar PDF adaptado'}</a>}
        {current?.hasAudio&&delivery!=='original'&&!dirty&&<section id="material-audio" className="form-stack"><h4>Ouvir prévia</h4><audio controls preload="none" aria-label="Ouvir a prévia do material" src={materialAssetUrl(missionId,current.id,'audio')}/></section>}
        {delivery==='adapted'&&current&&<>
          <button type="button" className="text-button" disabled={locked} onClick={()=>{setSelectedId('');setStep(1);setApproved(false);change();}}>Ajustar leitura</button>
          <details onToggle={e=>setEditText(e.currentTarget.open)}><summary>Ajustar o texto da prévia</summary>{editText&&document.map((p,i)=><section className="form-stack" key={p.page}><h4>Página {p.page}</h4><label htmlFor={`material-title-${p.page}`}>Título da página {p.page}</label><input id={`material-title-${p.page}`} value={p.title} maxLength={200} onChange={e=>{setDocument(old=>old.map((v,n)=>n===i?{...v,title:e.target.value}:v));setDirty(true);setReviewed(false);}}/><label htmlFor={`material-text-${p.page}`}>Texto da página {p.page}</label><textarea id={`material-text-${p.page}`} value={p.text} maxLength={12000} rows={6} onChange={e=>{setDocument(old=>old.map((v,n)=>n===i?{...v,text:e.target.value}:v));setDirty(true);setReviewed(false);}}/><label htmlFor={`material-description-${p.page}`}>Descrição das informações visuais da página {p.page}</label><textarea id={`material-description-${p.page}`} maxLength={4000} value={p.description} onChange={e=>{setDocument(old=>old.map((v,n)=>n===i?{...v,description:e.target.value}:v));setDirty(true);setReviewed(false);}}/></section>)}</details>
          {dirty&&<button className="button" type="button" disabled={busy||activityDirty} onClick={()=>void saveAndRender()}>Atualizar prévia →</button>}
          <details><summary>Leitura em texto e transcrição</summary><PreparedDocument document={current.document} missionId={missionId} adaptationId={current.id}/></details>
        </>}
        {version&&<StudentActivitySupport key={`${versionId}:${studentId}`} missionId={missionId} version={version} studentId={studentId} studentName={student.name} disabled={busy||!!pending} onDirty={activityChanged}/>}
        {!released&&<><label className="check"><input type="checkbox" disabled={dirty||activityDirty||busy||!!pending} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Conferi o material e o destinatário. Posso disponibilizar para {student.name}.</label><button className="button" type="button" disabled={!reviewed||dirty||activityDirty||busy||!!pending} onClick={()=>delivery==='original'?void sendOriginal():void operation(async()=>{update(await api('releaseMaterial',{params:{id:missionId,adaptationId:current!.id},body:{expectedRevision:current!.revision,reviewed:true}}));setMessage(`Material disponibilizado para ${student.name}. No rascunho, ficará disponível após publicar esta versão.`);})}>Disponibilizar para {student.name} →</button></>}
        <button className="text-button" type="button" disabled={dirty||activityDirty||busy} onClick={()=>{setStep(0);setSelectedId('');setEditText(false);}}>Preparar outro material</button>
      </section>}
    </>}
      </aside>
    </div>
    {busy&&<p role="status">Salvando sua solicitação…</p>}
    {!!adaptations.length&&<details className="simple-saved-materials"><summary>Materiais já preparados · {adaptations.length}</summary>{adaptations.map(a=><article className="paper" key={a.id}><h3>{sources.find(s=>s.id===a.sourceId)?.title??'Material'} · {students.find(s=>s.id===a.studentId)?.name??'Aluno sem vínculo ativo'}</h3><p>{a.mode==='original'?'PDF original':labels[a.status]}</p><div className="actions"><button type="button" className="button button-outline" disabled={busy||dirty||activityDirty} onClick={()=>{setSelectedId(a.id);setStudentId(a.studentId);setSourceId(a.sourceId);setDelivery(a.mode==='original'?'original':'adapted');setSupports(a.settings.supports);setFontSize(a.settings.fontSize);setColor(a.settings.color);setPageNumbers(a.pages);setDocument(a.document);setEditText(false);setActivityOnly(false);setStep(a.status==='ready'||a.status==='released'?3:2);setReviewed(false);}}>Abrir material</button>{!archived&&!['queued','generating','rendering'].includes(a.status)&&<button type="button" className="text-button" onClick={()=>{if(window.confirm('Retirar este material do aluno?'))void operation(async()=>{await api('removeMaterial',{params:{id:missionId,adaptationId:a.id}});setAdaptations(old=>old.filter(v=>v.id!==a.id));if(current?.id===a.id){setSelectedId('');setStep(0);}});}}>Remover material</button>}</div></article>)}</details>}
  </section>;
}
