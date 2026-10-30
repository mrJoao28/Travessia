"use client";
import { useEffect, useState } from "react";
import { SupportAudio } from "./support-audio";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";

export function MissionSupports({ missionId, versionId, stepId }: { missionId: string; versionId: string; stepId: string }) {
  const [items, setItems] = useState<ApiResponse<"missionSupports">["items"]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setItems([]); setError(""); setPending(true);
    void api("missionSupports", { params: { id: missionId }, query: { versionId }, signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setItems(value.items.filter(item => !item.stepId || item.stepId === stepId)); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [missionId, versionId, stepId, retry]);
  return <section className="mission-supports" aria-label="Apoios desta etapa">
    <h3>Apoios desta etapa</h3>
    {pending ? <p role="status">Consultando os apoios disponíveis…</p> : error ? <>
      <p role="alert">{error}</p><button className="text-button" onClick={() => setRetry(n => n + 1)}>Tentar carregar os apoios novamente</button>
    </> : items.length ? <><p className="small">Abra os apoios que forem úteis para você.</p>
      {items.map(item => <details className="example" key={item.id}><summary>{item.title}</summary><p className="submission-content">{item.content}</p>{item.hasAudio && <SupportAudio missionId={missionId} itemId={item.id} />}</details>)}
    </> : <p className="small">Nenhum apoio adicional disponível nesta etapa.</p>}
  </section>;
}
