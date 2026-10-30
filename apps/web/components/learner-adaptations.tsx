"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
export function LearnerAdaptations({ missionId, versionId, stepId, onFormats }: { missionId: string; versionId: string; stepId: string; onFormats: (formats: ApiResponse<"learnerAdaptations">["allowedFormats"]) => void }) {
  const [data, setData] = useState<ApiResponse<"learnerAdaptations"> | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError(""); onFormats(["text"]);
    void api("learnerAdaptations", { params: { id: missionId }, query: { versionId }, signal: controller.signal }).then(v => { if (!controller.signal.aborted) { setData(v); onFormats(v.allowedFormats); } }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [missionId, versionId, retry, onFormats]);
  return <section className="mission-supports" aria-label="Atividade adaptada"><h3>Atividade adaptada</h3>{error ? <><p role="alert">{error}</p><button className="text-button" onClick={() => setRetry(n => n + 1)}>Tentar carregar adaptações</button></> : !data ? <p role="status">Consultando adaptações e formatos disponíveis…</p> : data.items.filter(p => !p.stepId || p.stepId === stepId).map(p => <details className="example" key={p.id}><summary>Consultar enunciado adaptado</summary><p className="submission-content">{p.instructions}</p>{p.example && <><h4>Exemplo adaptado</h4><p className="submission-content">{p.example}</p></>}</details>)}</section>;
}
