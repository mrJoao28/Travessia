"use client";
import Link from "next/link";
import { TeacherSteps, useTeacherDraftGuard } from "./teacher-steps";
import { useEffect, useRef, useState } from "react";
import { api, pages, errorMessage, type ApiResponse, type ApiBody } from "../lib/product-client";
import type { MissionEntry } from "./live-workspace";

type Plan = ApiResponse<"createAdaptation">;
type Options = ApiResponse<"learningOptions">;
type Version = NonNullable<MissionEntry["mission"]["publishedVersion"]>;
export function LiveAdaptations({ entries, initialMissionId, initialVersionId }: { entries: MissionEntry[]; initialMissionId?: string; initialVersionId?: string }) {
  const [missionId, setMissionId] = useState(initialMissionId ?? entries[0]?.mission.id ?? "");
  const [dirty, setDirty] = useState(false);
  const entry = entries.find(e => e.mission.id === missionId);
  const canSwitch = () => !dirty || window.confirm("Há alterações ainda não salvas. Trocar de missão ou versão e descartá-las?");
  if (!entry) return <section className="paper"><h2>Escolha uma missão para preparar apoios</h2><Link className="text-link" href="/professor/missoes">Consultar minhas missões</Link></section>;
  return <>{initialMissionId ? <div className="teacher-mission-context"><Link className="text-link" href={`/professor/missoes/${entry.mission.id}/apoios`}>← Apoios da missão</Link><p>{entry.classroom.name} · {(entry.mission.publishedVersion ?? entry.mission.draftVersion)?.title}</p></div> : <div className="classroom-selector"><label htmlFor="adapt-mission">Missão para adaptar</label><select id="adapt-mission" value={missionId} onChange={e => { if (canSwitch()) { setDirty(false); setMissionId(e.target.value); } }}>{entries.map(e => <option value={e.mission.id} key={e.mission.id}>{e.classroom.name} · {(e.mission.publishedVersion ?? e.mission.draftVersion)?.title}</option>)}</select></div>}<AdaptationVersions key={entry.mission.id} entry={entry} initialVersionId={initialVersionId} onDirty={setDirty} canSwitch={canSwitch} /></>;
}
function AdaptationVersions({ entry, initialVersionId, onDirty, canSwitch }: { entry: MissionEntry; initialVersionId?: string; onDirty: (dirty: boolean) => void; canSwitch: () => boolean }) {
  const versions = [entry.mission.publishedVersion, entry.mission.draftVersion].filter((v): v is Version => !!v);
  const [versionId, setVersionId] = useState(versions.find(v => v.id === initialVersionId)?.id ?? versions[0]?.id ?? "");
  const version = versions.find(v => v.id === versionId);
  return <>{initialVersionId && !versions.some(v => v.id === initialVersionId) && <p className="notice">A versão escolhida mudou. Confira a versão disponível antes de preparar o apoio.</p>}{version && <>{versions.length > 1 ? <div className="classroom-selector"><label htmlFor="adapt-version">Versão para adaptar</label><select id="adapt-version" value={versionId} onChange={e => { if (canSwitch()) { onDirty(false); setVersionId(e.target.value); } }}>{versions.map(v => <option key={v.id} value={v.id}>{v.id === entry.mission.publishedVersion?.id ? "Publicada" : "Rascunho"} · {v.title}</option>)}</select></div> : <p className="small">{version.id === entry.mission.publishedVersion?.id ? "Versão publicada · os apoios revisados ficam disponíveis aos destinatários." : "Rascunho · os apoios ficam disponíveis quando esta versão for publicada."}</p>}<AdaptationForm key={versionId} entry={entry} version={version} onDirty={onDirty} /></>}</>;
}
function AdaptationForm({ entry, version, onDirty }: { entry: MissionEntry; version: Version; onDirty: (dirty: boolean) => void }) {
  const [stage, setStage] = useState(0);
  const [dirty, setDirty] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useTeacherDraftGuard(dirty);
  useEffect(() => { title.current?.focus(); }, [stage]);
  const [options, setOptions] = useState<Options | null>(null);
  const [students, setStudents] = useState<ApiResponse<"strategyRecipients">["items"]>([]);
  const [requests, setRequests] = useState<ApiResponse<"sharedLearningNeeds">["items"]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stepId, setStepId] = useState("");
  const [audience, setAudience] = useState<"classroom" | "students">("classroom");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [supports, setSupports] = useState<ApiBody<"createAdaptation">["supportNeeds"]>([]);
  const [formats, setFormats] = useState<ApiBody<"createAdaptation">["allowedFormats"]>(["text"]);
  const [instructions, setInstructions] = useState("");
  const [example, setExample] = useState("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [approved, setApproved] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<ApiResponse<"generateSupports">["draft"]>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const saveKey = useRef<string | null>(null);
  const aiKey = useRef<string | null>(null);
  const params = { id: entry.mission.id };
  useEffect(() => {
    let active = true; setRequests([]);
    void Promise.all([api("learningOptions"), pages("strategyRecipients", entry.mission.id), pages("sharedLearningNeeds", entry.classroom.id), api("adaptationPlans", { params, query: { versionId: version.id } })])
      .then(([o, s, r, p]) => { if (active) { setOptions(o); setStudents(s); setRequests(r); setPlans(p.items); setError(""); } }).catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [entry.mission.id, version.id, retry]);
  function change() { setDirty(true); onDirty(true); setReviewed(false); saveKey.current = null; setMessage(""); }
  function changeGeneration() { change(); setApproved(false); setDraft(null); aiKey.current = null; }
  function reset() { changeGeneration(); setEditing(null); setInstructions(""); setExample(""); setSupports([]); setFormats(["text"]); setStudentIds([]); setAudience("classroom"); setStepId(""); setStage(0); setDirty(false); onDirty(false); }
  const currentStep = version.steps.find(s => s.id === stepId);
  if (!options) return <section className="paper">{error ? <><p role="alert">{error}</p><button className="button" onClick={() => setRetry(n => n + 1)}>Tentar carregar adaptações</button></> : <p role="status">Consultando adaptações e pedidos autorizados…</p>}</section>;
  const readOnly = entry.mission.status === "archived";
  function next() {
    setError("");
    if (stage === 0) {
      if (audience === "students" && !studentIds.length) { setError("Escolha pelo menos um aluno para continuar."); document.getElementById("adapt-audience")?.focus(); return; }
      if (!instructions.trim()) { change(); setInstructions(currentStep?.instructions ?? version.description); setExample(currentStep?.example ?? ""); }
      setStage(1);
    } else if (stage === 1) {
      if (!instructions.trim()) { setError("Escreva as instruções para o aluno antes de conferir."); document.getElementById("adapt-instructions")?.focus(); return; }
      setReviewed(false); setStage(2);
    }
  }
  const recipients = audience === "classroom" ? "Turma inteira" : studentIds.map(id => students.find(s => s.id === id)?.name ?? "Aluno sem vínculo ativo").join(", ");
  return <div className="teacher-guide">
    <TeacherSteps labels={["Para quem", "Ajustar a atividade", "Conferir"]} current={stage} disabled={busy} onBack={value => { setReviewed(false); setStage(value); }} />
    {readOnly && <p className="notice">Esta missão está arquivada. Os apoios podem ser consultados, mas não alterados.</p>}
    <form noValidate onSubmit={async e => {
      e.preventDefault(); if (stage !== 2 || !reviewed || busy || readOnly || !instructions.trim() || (audience === "students" && !studentIds.length)) return;
      setBusy(true); setError("");
      const input = { versionId: version.id, stepId: stepId || null, audience, studentIds: audience === "students" ? studentIds : [], instructions, example, supportNeeds: supports, allowedFormats: formats, reviewed: true as const };
      try { const saved = editing ? await api("updateAdaptation", { params: { ...params, planId: editing.id }, body: { ...input, expectedRevision: editing.revision } }) : await api("createAdaptation", { params, body: { ...input, requestKey: saveKey.current ??= crypto.randomUUID() } }); setPlans(old => [...old.filter(p => p.id !== saved.id), saved]); reset(); setMessage(version.id === entry.mission.publishedVersion?.id ? "Adaptação revisada e disponível aos destinatários." : "Adaptação salva no rascunho; ficará disponível após publicar esta versão."); }
      catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
    }}>
      <fieldset className="editor-fields" disabled={busy || readOnly}>
        <div className="teacher-guide-grid">
          <section className="paper form-stack teacher-editor-panel">
            <h2 ref={title} tabIndex={-1}>{["Quem vai receber este apoio?", "O que o aluno deve fazer?", "Está tudo certo para disponibilizar?"][stage]}</h2>
            <p className="muted">{["Escolha a turma inteira ou os alunos que vão receber esta adaptação.", "Partimos do enunciado original. Ajuste o texto com uma ação por vez.", "Confira as instruções, os destinatários e as formas de entrega antes de confirmar."][stage]}</p>
            <div className="form-stack" hidden={stage !== 0}>
              <label htmlFor="adapt-audience">Destinatários da adaptação</label><select id="adapt-audience" value={audience} onChange={e => { change(); setAudience(e.target.value as typeof audience); }}><option value="classroom">Turma inteira</option><option value="students">Alunos selecionados</option></select>
              {audience === "students" && <fieldset className="strategy-fields teacher-choice-list"><legend>Alunos destinatários</legend>{!students.length && <p>Nenhum aluno ativo nesta turma.</p>}{students.map(s => <label className="check" key={s.id}><input type="checkbox" checked={studentIds.includes(s.id)} onChange={e => { change(); setStudentIds(old => e.target.checked ? [...old, s.id] : old.filter(id => id !== s.id)); }} />{s.name}</label>)}</fieldset>}
              <label htmlFor="adapt-step">Onde disponibilizar a adaptação</label><select id="adapt-step" value={stepId} onChange={e => { setStepId(e.target.value); changeGeneration(); }}><option value="">Missão inteira</option>{version.steps.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
              <details className="teacher-disclosure" open={requests.length > 0}><summary>Pedidos de apoio compartilhados</summary><p>Somente escolhas autorizadas pelos alunos. Uma deficiência não determina a adaptação e não é enviada à IA.</p>
                {!requests.length && <p>Nenhum aluno autorizou o compartilhamento neste contexto.</p>}
                {requests.map(r => <article className="example" key={r.userId}><h3>{r.name}</h3><p>Apoios: {r.supports.map(id => options.supports.find(o => o.id === id)?.label).join("; ") || "Nenhum indicado"}</p><p>Preferências de entrega: {r.preferredFormats.map(id => options.formats.find(o => o.id === id)?.label).join("; ") || "Nenhuma indicada"}</p>{r.disabilities !== null && <p>Deficiência autodeclarada e compartilhada: {r.disabilities.map(id => options.disabilities.find(o => o.id === id)?.label).join("; ") || "Nenhuma informada"}</p>}<button type="button" className="text-button" onClick={() => { changeGeneration(); setSupports(r.supports); setFormats([...new Set(["text" as const, ...r.preferredFormats])]); setAudience("students"); setStudentIds([r.userId]); if (!instructions.trim()) setInstructions(currentStep?.instructions ?? version.description); setStage(1); }}>Preparar adaptação com os apoios de {r.name}</button></article>)}
                <button type="button" className="text-button" onClick={() => setRetry(n => n + 1)}>Atualizar pedidos autorizados</button>
              </details>
            </div>
            <div className="form-stack" hidden={stage !== 1}>
              <div className="teacher-context-strip"><span><strong>Para:</strong> {recipients}</span><button type="button" className="text-button" onClick={() => setStage(0)}>Alterar</button></div>
              <label htmlFor="adapt-instructions">Enunciado adaptado</label><textarea id="adapt-instructions" required maxLength={6000} value={instructions} onChange={e => { change(); setInstructions(e.target.value); }} />
              <details className="teacher-ai"><summary>Pedir uma sugestão à IA (opcional)</summary><p>A assistência recebe somente material didático autorizado, objetivos, critérios e apoios genéricos selecionados. Não recebe identidade, deficiência ou entregas dos alunos. Não analisa imagens nem áudios.</p>
                {version.materials.map(m => <label className="check" key={m.id}><input type="checkbox" checked={materials.includes(m.id)} onChange={e => { changeGeneration(); setMaterials(old => e.target.checked ? [...old, m.id] : old.filter(id => id !== m.id)); }} />{m.title}</label>)}
                {!version.materials.length && <p>Adicione e salve um material textual no editor da missão para usar a IA. Você pode escrever a adaptação manualmente.</p>}
                <details><summary>Conferir textos selecionados para envio</summary><p>Objetivos: {version.objectives.join("; ")}</p><p>Critérios: {version.criteria.join("; ")}</p><p>Enunciado original: {currentStep?.instructions ?? version.description}</p>{version.materials.filter(m => materials.includes(m.id)).map(m => <p className="submission-content" key={m.id}>{m.title}: {m.text}</p>)}<p>Apoios: {supports.map(id => options.supports.find(o => o.id === id)?.label).join("; ")}</p></details>
                <label className="check"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />Conferi os textos e autorizo o envio de material didático sem dados pessoais ao Gemini.</label>
                <button type="button" className="button button-outline" disabled={!approved || !materials.length || materials.length > 3} onClick={async () => {
                  setBusy(true); setError(""); setMessage("");
                  try { const generated = await api("generateSupports", { params, body: { versionId: version.id, stepId: stepId || null, materialIds: materials, strategyIds: ["written-instructions", "worked-example"], activityAdaptation: true, supportNeeds: supports, approvedForProvider: true, idempotencyKey: aiKey.current ??= crypto.randomUUID() } }); setDraft(generated.draft); setMessage(generated.status === "succeeded" ? "Rascunho gerado. Revise antes de usar e disponibilizar." : "Consulte novamente a solicitação pelo mesmo botão."); if (generated.status === "failed") aiKey.current = null; }
                  catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
                }}>Sugerir um texto com IA</button>
                {draft && <section className="example" aria-label="Rascunho de adaptação"><h3>Rascunho para revisão</h3>{draft.items.map(i => <p key={i.strategyId} className="submission-content">{i.content}</p>)}<button type="button" className="text-button" onClick={() => { change(); setInstructions(draft.items.find(i => i.strategyId === "written-instructions")?.content ?? ""); setExample(draft.items.find(i => i.strategyId === "worked-example")?.content ?? ""); }}>Usar rascunho adaptado no editor</button></section>}
              </details>
              <label htmlFor="adapt-example">Exemplo adaptado (opcional)</label><textarea id="adapt-example" maxLength={3000} value={example} onChange={e => { change(); setExample(e.target.value); }} />
              <details className="teacher-disclosure"><summary>Apoios a considerar</summary><fieldset className="strategy-fields teacher-choice-list"><legend>Selecione os apoios necessários</legend>{options.supports.map(o => <label className="check" key={o.id}><input type="checkbox" checked={supports.includes(o.id)} onChange={e => { changeGeneration(); setSupports(old => e.target.checked ? [...old, o.id] : old.filter(id => id !== o.id)); }} />{o.label}</label>)}</fieldset></details>
              <details className="teacher-disclosure"><summary>Formas de entrega <span className="small">{formats.map(id => options.formats.find(o => o.id === id)?.label).join(" · ")}</span></summary><fieldset className="strategy-fields teacher-choice-list"><legend>Alternativas de entrega para a missão inteira</legend><p>Texto continua disponível. Os formatos liberados para o aluno se somam.</p>{options.formats.map(o => <label className="check" key={o.id}><input type="checkbox" disabled={o.id === "text"} checked={formats.includes(o.id)} onChange={e => { change(); setFormats(old => e.target.checked ? [...old, o.id] : old.filter(id => id !== o.id)); }} />{o.label}</label>)}</fieldset></details>
              <details className="teacher-disclosure"><summary>Consultar enunciado, objetivos e critérios originais</summary><p>{currentStep?.instructions ?? version.description}</p><p>Objetivos: {version.objectives.join("; ")}</p><p>Critérios: {version.criteria.join("; ")}</p><button type="button" className="text-button" onClick={() => { change(); setInstructions(currentStep?.instructions ?? version.description); setExample(currentStep?.example ?? ""); }}>Copiar enunciado original para editar</button></details>
            </div>
            <div className="form-stack" hidden={stage !== 2}>
              <p><strong>Destinatários:</strong> {recipients}</p><p><strong>Onde:</strong> {currentStep?.title ?? "Missão inteira"}</p><p>Os objetivos e critérios originais são preservados.</p><p>{version.id === entry.mission.publishedVersion?.id ? "Ao confirmar, o apoio ficará disponível para os destinatários." : "Este apoio só ficará disponível depois que esta versão for publicada."}</p>
              <label className="check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />Revisei a adaptação, os objetivos preservados, os formatos e os destinatários.</label>
            </div>
          </section>
          <aside className="paper teacher-student-preview" aria-label="Prévia do aluno"><p className="eyebrow">Prévia</p><h2>Assim o aluno vai ver</h2>{stage === 0 ? <p>Depois de escolher os destinatários, ajuste o texto e confira o resultado aqui.</p> : <><h3>{currentStep?.title ?? version.title}</h3><p className="submission-content">{instructions || "Escreva as instruções para visualizar."}</p>{example && <div className="notice"><strong>Exemplo</strong><p className="submission-content">{example}</p></div>}<p className="small">Objetivos mantidos: {version.objectives.join("; ")}</p><p className="small">Formatos liberados: {formats.map(id => options.formats.find(o => o.id === id)?.label).join("; ")}</p></>}</aside>
        </div>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}<p role="status">{message}</p>
      <footer className="teacher-guide-footer"><div>{stage > 0 && <button type="button" className="text-button" disabled={busy} onClick={() => { setReviewed(false); setStage(stage - 1); }}>← Voltar</button>}<span className="small">Etapa {stage + 1} de 3</span>{editing && <button type="button" className="text-button" disabled={busy} onClick={() => { if (!dirty || window.confirm("Descartar as alterações desta adaptação?")) reset(); }}>Cancelar edição</button>}</div>{stage < 2 ? <button type="button" className="button" disabled={busy || readOnly} onClick={next}>{stage === 0 ? "Continuar para a atividade →" : "Conferir adaptação →"}</button> : <button type="submit" className="button" disabled={busy || readOnly || !reviewed || !instructions.trim() || (audience === "students" && !studentIds.length)}>{busy ? "Salvando…" : "Salvar adaptação revisada"}</button>}</footer>
    </form>
    <section className="paper form-stack" aria-label="Adaptações salvas"><h2>Adaptações nesta versão</h2>{!plans.length && <p>Nenhuma adaptação salva nesta versão.</p>}{plans.map(p => <article className="example" key={p.id}><h3>{p.stepId ? version.steps.find(s => s.id === p.stepId)?.title : "Missão inteira"}</h3><p>{p.audience === "classroom" ? "Turma inteira" : p.studentIds.map(id => students.find(s => s.id === id)?.name ?? "Aluno sem vínculo ativo").join(", ")}</p><details><summary>Consultar texto e exemplo</summary><p className="submission-content">{p.instructions}</p><p className="submission-content">{p.example}</p></details>
      <div className="actions"><button type="button" className="text-button" disabled={busy || readOnly} onClick={() => { if (dirty && !window.confirm("Descartar o texto ainda não salvo e abrir esta adaptação?")) return; changeGeneration(); setEditing(p); setStepId(p.stepId ?? ""); setInstructions(p.instructions); setExample(p.example); setSupports(p.supportNeeds); setFormats(p.allowedFormats); setAudience(p.audience); setStudentIds(p.studentIds); setStage(1); }}>Editar adaptação</button><button type="button" className="text-button teacher-danger" disabled={busy || readOnly} onClick={async () => {
        if (!window.confirm("Remover esta adaptação e seus formatos adicionais de entrega? Entregas já enviadas serão preservadas.")) return;
        setBusy(true); setError(""); try { await api("removeAdaptation", { params: { ...params, planId: p.id }, body: { expectedRevision: p.revision } }); setPlans(old => old.filter(a => a.id !== p.id)); if (editing?.id === p.id) reset(); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
      }}>Remover adaptação</button></div>
    </article>)}</section>
  </div>;
}
