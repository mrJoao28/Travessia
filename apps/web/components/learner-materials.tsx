"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
import { materialAssetUrl, materialReadingStyle, PreparedDocument } from "./prepared-material";

export function LearnerMaterials({ missionId, versionId }: { missionId: string; versionId: string }) {
  const [items, setItems] = useState<ApiResponse<"learnerMaterials">["items"] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setItems(null);
    setError("");
    void api("learnerMaterials", { params: { id: missionId }, query: { versionId }, signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setItems(value.items); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); });
    return () => controller.abort();
  }, [missionId, versionId, retry]);

  return <section className="mission-supports" aria-labelledby="learner-materials-title">
    <h3 id="learner-materials-title" tabIndex={-1}>Materiais preparados para você</h3>
    {error ? <>
      <p role="alert">Não foi possível consultar seus materiais preparados. {error}</p>
      <button className="text-button" onClick={() => setRetry(n => n + 1)}>Consultar materiais novamente</button>
    </> : items === null ? <p role="status">Consultando materiais preparados…</p>
      : items.length === 0 ? <p role="status">Nenhum material preparado para você nesta versão.</p>
      : <>
        <p role="status">{items.length === 1 ? "1 material disponível." : `${items.length} materiais disponíveis.`}</p>
        <p className="small">Use a leitura, o PDF ou o áudio que preferir.</p>
        {items.map(item => <details className="paper" key={item.id}>
          <summary>{item.title}</summary>
          {item.mode === "original" ? <p>PDF original disponibilizado pelo professor, sem alterações.</p>
            : <div className={item.reading ? "comparison-paper" : undefined} data-color={item.reading?.color} style={item.reading ? materialReadingStyle(item.reading) : undefined}>
              <PreparedDocument document={item.document} missionId={missionId} adaptationId={item.id} />
            </div>}
          <a className="button button-outline" href={materialAssetUrl(missionId, item.id, "pdf")} download>
            {item.mode === "original" ? "Baixar PDF original" : "Baixar PDF adaptado"}
          </a>
          {item.hasAudio && <div className="form-stack">
            <p>Áudio do material. As descrições visuais estão no texto acima.</p>
            <audio controls preload="none" aria-label={`Ouvir ${item.title}`} src={materialAssetUrl(missionId, item.id, "audio")} />
            <a className="text-link" href={materialAssetUrl(missionId, item.id, "audio")} download>Baixar áudio do material</a>
          </div>}
        </details>)}
      </>}
  </section>;
}
