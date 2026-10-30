"use client";
import { useEffect, useRef, useState } from "react";
import { api, pages, errorMessage, type ApiResponse, type ApiBody } from "../lib/product-client";
import type { MissionEntry } from "./live-workspace";

type Plan = ApiResponse<"createAdaptation">;
type Options = ApiResponse<"learningOptions">;
type Version = NonNullable<MissionEntry["mission"]["publishedVersion"]>;
export function LiveAdaptations({ entries }: { entries: MissionEntry[] }) {
  const [missionId, setMissionId] = useState(entries[0]?.mission.id ?? "");
  const entry = entries.find(e => e.mission.id === missionId);
  if (!entry) return <p className="paper">Crie uma missão para preparar adaptações de atividades.</p>;
  return <><div className="classroom-selector"><label htmlFor="adapt-mission">Missão para adaptar</label><select id="adapt-mission" value={missionId} onChange={e => setMissionId(e.target.value)}>{entries.map(e => <option value={e.mission.id} key={e.mission.id}>{e.classroom.name} · {(e.mission.publishedVersion ?? e.mission.draftVersion)?.title}</option>)}</select></div><AdaptationVersions key={entry.mission.id} entry={entry} /></>;
}
function AdaptationVersions({ entry }: { entry: MissionEntry }) {
  const versions = [entry.mission.publishedVersion, entry.mission.draftVersion].filter((v): v is Version => !!v);
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const version = versions.find(v => v.id === versionId);
  return <>{version && <><div className="classroom-selector"><label htmlFor="adapt-version">Versão para adaptar</label><select id="adapt-version" value={versionId} onChange={e => setVersionId(e.target.value)}>{versions.map(v => <option key={v.id} value={v.id}>{v.id === entry.mission.publishedVersion?.id ? "Publicada" : "Rascunho"} · {v.title}</option>)}</select></div><AdaptationForm key={versionId} entry={entry} version={version} /></>}</>;
}
function AdaptationForm({ entry, version }: { entry: MissionEntry; version: Version }) {
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
  function change() { setReviewed(false); saveKey.current = null; setMessage(""); }
  function changeGeneration() { change(); setApproved(false); setDraft(null); aiKey.current = null; }
  function reset() { changeGeneration(); setEditing(null); setInstructions(""); setExample(""); setSupports([]); setFormats(["text"]); setStudentIds([]); setAudience("classroom"); setStepId(""); }
  const currentStep = version.steps.find(s => s.id === stepId);
  if (!options) return <section className="paper">{error ? <><p role="alert">{error}</p><button className="button" onClick={() => setRetry(n => n + 1)}>Tentar carregar adaptações</button></> : <p role="status">Consultando adaptações e pedidos autorizados…</p>}</section>;
  const readOnly = entry.mission.status === "archived";
  return <div className="form-stack">
    <section className="paper form-stack" aria-label="Pedidos de apoio compartilhados"><h2>Pedidos de apoio compartilhados</h2><p>Somente escolhas autorizadas pelos alunos desta turma. A deficiência autodeclarada não determina uma adaptação e não é enviada ao Gemini.</p>
      {!requests.length && <p>Nenhum aluno autorizou o compartilhamento neste contexto.</p>}
      {requests.map(r => <article className="example" key={r.userId}><h3>{r.name}</h3><p>Apoios: {r.supports.map(id => options.supports.find(o => o.id === id)?.label).join("; ") || "Nenhum indicado"}</p><p>Preferências de entrega: {r.preferredFormats.map(id => options.formats.find(o => o.id === id)?.label).join("; ") || "Nenhuma indicada"}</p>
        {r.disabilities !== null && <p>Deficiência autodeclarada e compartilhada: {r.disabilities.map(id => options.disabilities.find(o => o.id === id)?.label).join("; ") || "Nenhuma informada"}</p>}
        <button className="text-button" disabled={busy || readOnly} onClick={() => { changeGeneration(); setSupports(r.supports); setFormats([...new Set(["text" as const, ...r.preferredFormats])]); setAudience("students"); setStudentIds([r.userId]); }}>Preparar adaptação com os apoios de {r.name}</button>
      </article>)}
      <button className="text-button" disabled={busy} onClick={() => setRetry(n => n + 1)}>Atualizar pedidos autorizados</button>
    </section>
    <form className="paper form-stack" onSubmit={async e => {
      e.preventDefault(); if (!reviewed || busy) return; setBusy(true); setError("");
      const input = { versionId: version.id, stepId: stepId || null, audience, studentIds: audience === "students" ? studentIds : [], instructions, example, supportNeeds: supports, allowedFormats: formats, reviewed: true as const };
      try { const saved = editing ? await api("updateAdaptation", { params: { ...params, planId: editing.id }, body: { ...input, expectedRevision: editing.revision } }) : await api("createAdaptation", { params, body: { ...input, requestKey: saveKey.current ??= crypto.randomUUID() } }); setPlans(old => [...old.filter(p => p.id !== saved.id), saved]); reset(); setMessage(version.id === entry.mission.publishedVersion?.id ? "Adaptação revisada e disponível aos destinatários." : "Adaptação salva no rascunho; ficará disponível após publicar esta versão."); }
      catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
    }}>
      <fieldset className="strategy-fields form-stack" disabled={busy || readOnly}><legend>{editing ? "Editar adaptação" : "Preparar atividade adaptada"}</legend>
        <p>Objetivos e critérios originais são preservados. Adaptações pertencem a esta versão; revise novamente ao publicar outra versão.</p>
        <label htmlFor="adapt-step">Onde disponibilizar a adaptação</label><select id="adapt-step" value={stepId} onChange={e => { setStepId(e.target.value); changeGeneration(); }}><option value="">Missão inteira</option>{version.steps.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
        <details><summary>Consultar enunciado, objetivos e critérios originais</summary><p>{currentStep?.instructions ?? version.description}</p><p>Objetivos: {version.objectives.join("; ")}</p><p>Critérios: {version.criteria.join("; ")}</p></details>
        <button type="button" className="text-button" onClick={() => { change(); setInstructions(currentStep?.instructions ?? version.description); setExample(currentStep?.example ?? ""); }}>Copiar enunciado original para editar</button>
        <fieldset className="strategy-fields form-stack"><legend>Apoios a considerar nesta adaptação</legend>{options.supports.map(o => <label className="check" key={o.id}><input type="checkbox" checked={supports.includes(o.id)} onChange={e => { changeGeneration(); setSupports(old => e.target.checked ? [...old, o.id] : old.filter(id => id !== o.id)); }} />{o.label}</label>)}</fieldset>
        <details><summary>Gerar rascunho de adaptação com Gemini</summary><p>A assistência recebe somente os apoios genéricos selecionados, objetivos, instruções da etapa e materiais abaixo. Não recebe identidade, deficiência, preferências privadas ou entregas de alunos. Não analisa imagens nem áudios.</p>
          {version.materials.map(m => <label className="check" key={m.id}><input type="checkbox" checked={materials.includes(m.id)} onChange={e => { changeGeneration(); setMaterials(old => e.target.checked ? [...old, m.id] : old.filter(id => id !== m.id)); }} />{m.title}</label>)}
          <details><summary>Conferir textos selecionados para envio</summary><p>Objetivos: {version.objectives.join("; ")}</p><p>Critérios: {version.criteria.join("; ")}</p><p>Enunciado original: {currentStep?.instructions ?? version.description}</p>{version.materials.filter(m => materials.includes(m.id)).map(m => <p className="submission-content" key={m.id}>{m.title}: {m.text}</p>)}<p>Apoios: {supports.map(id => options.supports.find(o => o.id === id)?.label).join("; ")}</p></details>
          <label className="check"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />Conferi os textos e autorizo o envio de material didático sem dados pessoais ao Gemini.</label>
          <button type="button" className="button button-outline" disabled={!approved || !materials.length || materials.length > 3} onClick={async () => {
            setBusy(true); setError(""); setMessage("");
            try { const generated = await api("generateSupports", { params, body: { versionId: version.id, stepId: stepId || null, materialIds: materials, strategyIds: ["written-instructions", "worked-example"], activityAdaptation: true, supportNeeds: supports, approvedForProvider: true, idempotencyKey: aiKey.current ??= crypto.randomUUID() } }); setDraft(generated.draft); setMessage(generated.status === "succeeded" ? "Rascunho gerado. Revise antes de usar e disponibilizar." : "Consulte novamente a solicitação pelo mesmo botão."); if (generated.status === "failed") aiKey.current = null; }
            catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
          }}>Gerar adaptação com Gemini</button>
          {draft && <section className="example" aria-label="Rascunho de adaptação"><h3>Rascunho para revisão</h3>{draft.items.map(i => <p key={i.strategyId} className="submission-content">{i.content}</p>)}<button type="button" className="text-button" onClick={() => { change(); setInstructions(draft.items.find(i => i.strategyId === "written-instructions")?.content ?? ""); setExample(draft.items.find(i => i.strategyId === "worked-example")?.content ?? ""); }}>Usar rascunho adaptado no editor</button></section>}
        </details>
        <label htmlFor="adapt-instructions">Enunciado adaptado</label><textarea id="adapt-instructions" required maxLength={6000} value={instructions} onChange={e => { change(); setInstructions(e.target.value); }} />
        <label htmlFor="adapt-example">Exemplo adaptado (opcional)</label><textarea id="adapt-example" maxLength={3000} value={example} onChange={e => { change(); setExample(e.target.value); }} />
        <fieldset className="strategy-fields form-stack"><legend>Alternativas de entrega para a missão inteira</legend><p>Texto continua disponível. Os formatos liberados pelas adaptações destinadas ao aluno se somam.</p>{options.formats.map(o => <label className="check" key={o.id}><input type="checkbox" disabled={o.id === "text"} checked={formats.includes(o.id)} onChange={e => { change(); setFormats(old => e.target.checked ? [...old, o.id] : old.filter(id => id !== o.id)); }} />{o.label}</label>)}</fieldset>
        <label htmlFor="adapt-audience">Destinatários da adaptação</label><select id="adapt-audience" value={audience} onChange={e => { change(); setAudience(e.target.value as typeof audience); }}><option value="classroom">Turma inteira</option><option value="students">Alunos selecionados</option></select>
        {audience === "students" && <fieldset className="strategy-fields form-stack"><legend>Alunos destinatários</legend>{students.map(s => <label className="check" key={s.id}><input type="checkbox" checked={studentIds.includes(s.id)} onChange={e => { change(); setStudentIds(old => e.target.checked ? [...old, s.id] : old.filter(id => id !== s.id)); }} />{s.name}</label>)}</fieldset>}
        <details><summary>Prévia do aluno</summary><h3>Atividade adaptada</h3><p className="submission-content">{instructions}</p><p className="submission-content">{example}</p><p>Formatos liberados: {formats.map(id => options.formats.find(o => o.id === id)?.label).join("; ")}</p></details>
        <label className="check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />Revisei a adaptação, os objetivos preservados, os formatos e os destinatários.</label>
        <button className="button" disabled={!reviewed || !instructions.trim() || (audience === "students" && !studentIds.length)}>Salvar adaptação revisada</button>
        {editing && <button type="button" className="text-button" onClick={reset}>Cancelar edição da adaptação</button>}
      </fieldset>
    </form>
    {error && <p role="alert">{error}</p>}<p role="status">{message}</p>
    <section className="paper form-stack" aria-label="Adaptações salvas"><h2>Adaptações nesta versão</h2>{!plans.length && <p>Nenhuma adaptação salva nesta versão.</p>}{plans.map(p => <article className="example" key={p.id}><h3>{p.stepId ? version.steps.find(s => s.id === p.stepId)?.title : "Missão inteira"}</h3><p>{p.audience === "classroom" ? "Turma inteira" : p.studentIds.map(id => students.find(s => s.id === id)?.name ?? "Aluno sem vínculo ativo").join(", ")}</p><p className="submission-content">{p.instructions}</p><p className="submission-content">{p.example}</p>
      <div className="actions"><button className="button button-outline" disabled={busy || readOnly} onClick={() => { changeGeneration(); setEditing(p); setStepId(p.stepId ?? ""); setInstructions(p.instructions); setExample(p.example); setSupports(p.supportNeeds); setFormats(p.allowedFormats); setAudience(p.audience); setStudentIds(p.studentIds); }}>Editar adaptação</button><button className="text-button" disabled={busy || readOnly} onClick={async () => {
        if (!window.confirm("Remover esta adaptação e seus formatos adicionais de entrega? Entregas já enviadas serão preservadas.")) return;
        setBusy(true); setError(""); try { await api("removeAdaptation", { params: { ...params, planId: p.id }, body: { expectedRevision: p.revision } }); setPlans(old => old.filter(a => a.id !== p.id)); if (editing?.id === p.id) reset(); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
      }}>Remover adaptação</button></div>
    </article>)}</section>
  </div>;
}
