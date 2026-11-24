"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
export function LearnerAdaptations({ missionId, versionId, stepId, originalInstructions, onFormats }: { missionId: string; versionId: string; stepId: string; originalInstructions: string; onFormats: (formats: ApiResponse<"learnerAdaptations">["allowedFormats"]) => void }) {
  const [data, setData] = useState<ApiResponse<"learnerAdaptations"> | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError("");
    void api("learnerAdaptations", { params: { id: missionId }, query: { versionId }, signal: controller.signal }).then(v => { if (!controller.signal.aborted) { setData(v); onFormats(v.allowedFormats); } }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [missionId, versionId, retry, onFormats]);
  const specific = data?.items.filter(p => p.stepId === stepId) ?? [];
  const activityWide = data?.items.filter(p => p.stepId === null) ?? [];
  const applicable = specific.length ? specific : activityWide;
  if (error) return <><p role="alert">Não foi possível consultar as orientações da atividade.</p><button className="text-button" onClick={() => setRetry(n => n + 1)}>Tentar carregar adaptações</button></>;
  if (!data) return <p role="status">Consultando as orientações da atividade…</p>;
  const instructions = applicable.length ? applicable.map(plan => plan.instructions).join("\n\n") : originalInstructions;
  return <>
    <p className="submission-content"><strong>Descrição da atividade: </strong>{instructions}</p>
    {applicable.filter(plan => plan.example).map(plan => <p className="submission-content" key={plan.id}><strong>Exemplo: </strong>{plan.example}</p>)}
  </>;
}
