"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
import type { Classroom } from "./live-workspace";

type Options = ApiResponse<"learningOptions">;
type Needs = ApiResponse<"learningNeeds">;
type Share = ApiResponse<"needsSharing">;
export function LearningNeeds({ classrooms }: { classrooms: Classroom[] }) {
  const [options, setOptions] = useState<Options | null>(null);
  const [needs, setNeeds] = useState<Needs | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const rooms = classrooms.filter(c => c.role === "student");
  async function loadShares() { return Promise.all(rooms.map(c => api("needsSharing", { params: { id: c.id } }))); }
  useEffect(() => {
    let active = true;
    void Promise.all([api("learningOptions"), api("learningNeeds"), loadShares()]).then(([o, n, s]) => { if (active) { setOptions(o); setNeeds(n); setShares(s); setError(""); } }).catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [classrooms, retry]);
  if (!options || !needs) return <section className="paper"><h2>Meus apoios de aprendizagem</h2>{error ? <><p role="alert">{error}</p><button className="button" onClick={() => setRetry(n => n + 1)}>Tentar carregar minhas escolhas</button></> : <p role="status">Consultando suas escolhas privadas…</p>}</section>;
  const select = <K extends "disabilities" | "supports" | "preferredFormats">(key: K, value: Needs[K][number], checked: boolean) => { setDirty(true); setNeeds(old => old && ({ ...old, [key]: checked ? [...old[key], value] : old[key].filter(v => v !== value) })); };
  return <>
    <section className="paper form-stack" aria-label="Meus apoios de aprendizagem"><h2>Meus apoios de aprendizagem</h2>
      <p>Preenchimento voluntário. Você pode pedir apoios sem declarar deficiência e alterar ou limpar suas escolhas. Não informe laudos ou diagnósticos.</p>
      <form className="form-stack" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError(""); setMessage("");
        try { const saved = await api("updateLearningNeeds", { body: { disabilities: needs.disabilities, supports: needs.supports, preferredFormats: needs.preferredFormats, expectedRevision: needs.revision } }); setNeeds(saved); setShares(await loadShares()); setDirty(false); setMessage("Escolhas salvas. Revise e autorize novamente as turmas com quem deseja compartilhar."); }
        catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
      }}>
        <fieldset disabled={busy} className="strategy-fields form-stack"><legend>Quais apoios você gostaria de solicitar?</legend>
          {options.supports.map(o => <label className="check" key={o.id}><input type="checkbox" checked={needs.supports.includes(o.id)} onChange={e => select("supports", o.id, e.target.checked)} />{o.label}</label>)}
        </fieldset>
        <fieldset disabled={busy} className="strategy-fields form-stack"><legend>Como você prefere responder às atividades?</legend>
          <p className="small">Estas são preferências. O professor confirma os formatos adequados a cada missão.</p>
          {options.formats.map(o => <label className="check" key={o.id}><input type="checkbox" checked={needs.preferredFormats.includes(o.id)} onChange={e => select("preferredFormats", o.id, e.target.checked)} />{o.label}</label>)}
        </fieldset>
        <details><summary>Informar deficiência autodeclarada (opcional)</summary><p>Essa informação não determina suas adaptações. Por padrão, permanece privada.</p>
          <fieldset disabled={busy} className="strategy-fields form-stack"><legend>Desejo informar voluntariamente</legend>{options.disabilities.map(o => <label className="check" key={o.id}><input type="checkbox" checked={needs.disabilities.includes(o.id)} onChange={e => select("disabilities", o.id, e.target.checked)} />{o.label}</label>)}</fieldset>
        </details>
        <p className="notice">Salvar novas escolhas suspende os compartilhamentos anteriores. Você decide novamente quais docentes poderão recebê-las.</p>
        <div className="actions"><button className="button" disabled={busy}>Salvar minhas escolhas</button><button type="button" className="text-button" disabled={busy} onClick={() => { setDirty(true); setNeeds({ ...needs, disabilities: [], supports: [], preferredFormats: [] }); }}>Limpar seleções para salvar</button></div>
      </form>
    </section>
    <section className="paper form-stack" aria-label="Compartilhamento dos meus apoios"><h2>Compartilhar por turma</h2><p>Somente docentes com vínculo ativo na turma autorizada podem consultar. Outros alunos não recebem suas escolhas. Suas informações pessoais não são enviadas ao Gemini.</p>
      {dirty && <p className="notice">Salve suas alterações antes de autorizar um novo compartilhamento.</p>}
      {shares.map(share => <Sharing key={`${share.classroomId}:${share.revision}`} share={share} name={rooms.find(c => c.id === share.classroomId)?.name ?? "Turma"} disabled={busy || dirty || needs.revision === 0} revokingDisabled={busy} onSave={async (shared, includeDisabilities) => {
        setBusy(true); setError(""); setMessage("");
        try { const saved = await api("updateNeedsSharing", { params: { id: share.classroomId }, body: { shared, includeDisabilities, expectedRevision: share.revision } }); setShares(old => old.map(s => s.classroomId === saved.classroomId ? saved : s)); setMessage(shared ? "Compartilhamento salvo para os docentes desta turma." : "Compartilhamento revogado. Novas consultas dos docentes serão bloqueadas."); }
        catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
      }} />)}
      {!rooms.length && <p>O compartilhamento fica disponível quando você participa de uma turma como aluno.</p>}
    </section>
    {error && <p role="alert">{error}</p>}<p role="status">{message}</p>
  </>;
}
function Sharing({ share, name, disabled, revokingDisabled, onSave }: { revokingDisabled: boolean; share: Share; name: string; disabled: boolean; onSave: (shared: boolean, disabilities: boolean) => Promise<void> }) {
  const [shared, setShared] = useState(share.shared);
  const [include, setInclude] = useState(share.includeDisabilities);
  return <form className="form-stack example" onSubmit={e => { e.preventDefault(); void onSave(shared, include); }}>
    <h3>{name}</h3><label className="check"><input disabled={disabled} type="checkbox" checked={shared} onChange={e => { setShared(e.target.checked); if (!e.target.checked) setInclude(false); }} />Compartilhar apoios e preferências com docentes de {name}</label>
    <label className="check"><input disabled={disabled || !shared} type="checkbox" checked={include} onChange={e => setInclude(e.target.checked)} />Também compartilhar minha deficiência autodeclarada com docentes de {name}</label>
    <p className="small">{shared ? include ? "Docentes desta turma receberão apoios, preferências e a deficiência informada." : "Docentes desta turma receberão somente apoios e preferências." : "Sem compartilhamento com esta turma."}</p>
    <button className="button button-outline" disabled={disabled}>Salvar compartilhamento de {name}</button>
    {share.shared && <button type="button" className="text-button" disabled={revokingDisabled} onClick={() => void onSave(false, false)}>Revogar compartilhamento de {name}</button>}
  </form>;
}
