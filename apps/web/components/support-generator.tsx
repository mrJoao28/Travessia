"use client";
import { useRef, useState } from "react";
import { api, errorMessage, type ApiBody, type ApiResponse } from "../lib/product-client";
import type { MissionEntry } from "./live-workspace";

type Version = NonNullable<MissionEntry["mission"]["publishedVersion"]>;
const supported = new Set(["step-checklist", "worked-example", "context-glossary", "written-instructions", "planning-outline"]);
export function SupportGenerator({ missionId, version, stepId, selected, onApply, onBusy }: { missionId: string; version: Version; stepId: string; selected: { id: string; title: string }[]; onApply: (id: string, content: string) => void; onBusy: (busy: boolean) => void }) {
  const ids = selected.filter(s => supported.has(s.id)).map(s => s.id) as ApiBody<"generateSupports">["strategyIds"];
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<ApiResponse<"generateSupports">["draft"]>(null);
  const requestKey = useRef<string | null>(null);
  return <section className="paper form-stack" aria-label="Assistência Gemini para apoios">
    <h3>Gerar rascunhos com Gemini</h3>
    <p>Gere checklist, exemplo comentado, glossário, instruções ou roteiro para as estratégias selecionadas. Revise e edite antes de salvar os apoios.</p>
    <p className="small">Descrições de imagens e transcrições devem ser preparadas pelo professor. Esta geração recebe somente texto e não analisa imagens nem áudios.</p>
    <fieldset disabled={busy} className="strategy-fields form-stack"><legend>Material didático para enviar ao Gemini (até 3)</legend>
      {version.materials.map(m => <label className="check" key={m.id}><input type="checkbox" checked={materialIds.includes(m.id)} onChange={e => {
        setApproved(false); setDraft(null); requestKey.current = null;
        setMaterialIds(old => e.target.checked ? [...old, m.id] : old.filter(id => id !== m.id));
      }} />{m.title}</label>)}
      {!version.materials.length && <p>Adicione material textual à missão para usar a assistência.</p>}
      <details><summary>Conferir o conteúdo que será enviado</summary><p>Objetivos: {version.objectives.join("; ")}</p>
        {stepId && <p>Etapa: {version.steps.find(s => s.id === stepId)?.title} — {version.steps.find(s => s.id === stepId)?.instructions}</p>}
        {version.materials.filter(m => materialIds.includes(m.id)).map(m => <div key={m.id}><h4>{m.title}</h4><p className="submission-content">{m.text}</p></div>)}
        <p>Também serão enviadas as orientações genéricas das estratégias selecionadas.</p>
      </details>
      <label className="check"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />Conferi o conteúdo e autorizo seu envio ao Gemini. Ele contém apenas material didático, sem dados pessoais ou confidenciais.</label>
      <button type="button" className="button button-outline" disabled={!approved || !ids.length || !materialIds.length || materialIds.length > 3} onClick={async () => {
        setBusy(true); onBusy(true); setMessage("");
        try {
          const result = await api("generateSupports", { params: { id: missionId }, body: { versionId: version.id, stepId: stepId || null, materialIds, strategyIds: ids, approvedForProvider: true, idempotencyKey: requestKey.current ??= crypto.randomUUID() } });
          setDraft(result.draft); setMessage(result.status === "succeeded" ? "Rascunhos preparados. Confira cada texto antes de usá-lo." : result.status === "running" ? "Solicitação em andamento. Consulte novamente com o mesmo botão." : "A geração falhou. Você pode tentar uma nova solicitação.");
          if (result.status === "failed") requestKey.current = null;
        } catch (reason) { setMessage(errorMessage(reason)); }
        finally { setBusy(false); onBusy(false); }
      }}>{busy ? "Gerando rascunhos…" : "Gerar apoios com Gemini"}</button>
    </fieldset>
    <p role="status">{message}</p>
    {draft?.items.map(item => <div className="example" key={item.strategyId}><h4>{selected.find(s => s.id === item.strategyId)?.title}</h4><p className="submission-content">{item.content}</p><button type="button" className="text-button" disabled={busy} onClick={() => onApply(item.strategyId, item.content)}>Usar este rascunho no apoio</button></div>)}
  </section>;
}
