"use client";
import { useRef, useState } from "react";
import { api, errorMessage, type ApiBody, type ApiResponse } from "../lib/product-client";
import type { MissionEntry } from "./live-workspace";

type Version = NonNullable<MissionEntry["mission"]["publishedVersion"]>;
const supported = new Set(["step-checklist", "worked-example", "context-glossary", "written-instructions", "planning-outline"]);
export function SupportGenerator({ missionId, version, stepId, selected, onApply, onBusy, instructionsOnly = false }: { missionId: string; version: Version; stepId: string; selected: { id: string; title: string }[]; onApply: (id: string, content: string) => void; onBusy: (busy: boolean) => void; instructionsOnly?: boolean }) {
  const ids = selected.filter(s => supported.has(s.id)).map(s => s.id) as ApiBody<"generateSupports">["strategyIds"];
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<ApiResponse<"generateSupports">["draft"]>(null);
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const canGenerate = approved && ids.length > 0 && materialIds.length > 0 && materialIds.length <= 3;
  async function generate(strategyIds: typeof ids, replaceOne = false) {
    if (busy || !canGenerate) return;
    const fingerprint = JSON.stringify({ versionId: version.id, stepId, materialIds, strategyIds });
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    onBusy(true);
    setMessage("");
    try {
      const result = await api("generateSupports", {
        params: { id: missionId },
        body: { versionId: version.id, stepId: stepId || null, materialIds, strategyIds, approvedForProvider: true, idempotencyKey: request.current.key },
      });
      if (result.status === "succeeded" && result.draft) {
        const generated = result.draft;
        setDraft(previous => replaceOne
          ? { items: [...(previous?.items.filter(item => !strategyIds.includes(item.strategyId)) ?? []), ...generated.items] }
          : generated);
        setMessage("Rascunhos preparados. Confira cada texto antes de usá-lo.");
        request.current = null;
      } else if (result.status === "failed") {
        request.current = null;
        setMessage("A geração falhou. Você pode tentar uma nova solicitação.");
      } else {
        setMessage("Solicitação em andamento. Consulte novamente com o mesmo botão.");
      }
    } catch (reason) {
      setMessage(errorMessage(reason));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return <section className="paper form-stack" aria-label="Assistência Gemini para apoios">
    <h3>{instructionsOnly ? "Refazer instruções da etapa" : "Gerar rascunhos com Gemini"}</h3>
    <p>{instructionsOnly ? "O Gemini prepara uma sugestão de instruções para a etapa escolhida. Confira o texto antes de aplicar." : "Gere checklist, exemplo comentado, glossário, instruções ou roteiro para as estratégias selecionadas. Revise e edite antes de salvar os apoios."}</p>
    <p className="small">Esta assistência prepara somente apoios em texto. Para descrever imagens de um PDF e gerar áudio, use a preparação de material individual acima. Você revisa os resultados antes de liberar.</p>
    <fieldset disabled={busy} className="strategy-fields form-stack"><legend>Material didático para enviar ao Gemini (até 3)</legend>
      {version.materials.map(m => <label className="check" key={m.id}><input type="checkbox" checked={materialIds.includes(m.id)} onChange={e => {
        setApproved(false); setDraft(null); request.current = null;
        setMaterialIds(old => e.target.checked ? [...old, m.id] : old.filter(id => id !== m.id));
      }} />{m.title}</label>)}
      {!version.materials.length && <p>Adicione material textual à missão para usar a assistência.</p>}
      <details><summary>Conferir o conteúdo que será enviado</summary><p>Objetivos: {version.objectives.join("; ")}</p>
        {stepId && <p>Etapa: {version.steps.find(s => s.id === stepId)?.title} — {version.steps.find(s => s.id === stepId)?.instructions}</p>}
        {version.materials.filter(m => materialIds.includes(m.id)).map(m => <div key={m.id}><h4>{m.title}</h4><p className="submission-content">{m.text}</p></div>)}
        <p>Também serão enviadas as orientações genéricas das estratégias selecionadas.</p>
      </details>
      <label className="check"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />Conferi o conteúdo e autorizo seu envio ao Gemini. Ele contém apenas material didático, sem dados pessoais ou confidenciais.</label>
      <button type="button" className="button button-outline" disabled={!canGenerate} onClick={() => void generate(ids)}>
        {busy ? "Gerando rascunhos…" : instructionsOnly ? "Gerar instruções da etapa" : "Gerar apoios com Gemini"}
      </button>
    </fieldset>
    <p role="status">{message}</p>
    {draft?.items.map(item => <div className="example" key={item.strategyId}><h4>{selected.find(s => s.id === item.strategyId)?.title}</h4><p className="submission-content">{item.content}</p><button type="button" className="text-button" disabled={busy} onClick={() => onApply(item.strategyId, item.content)}>{instructionsOnly ? "Usar nas instruções da etapa" : "Usar este rascunho no apoio"}</button>
      {ids.length > 1 && ids.includes(item.strategyId) && <button type="button" className="text-button" disabled={busy || !canGenerate} onClick={() => void generate([item.strategyId], true)}>Refazer somente este apoio</button>}
    </div>)}
  </section>;
}
