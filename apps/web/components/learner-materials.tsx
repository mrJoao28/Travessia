"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
import { materialAssetUrl, materialReadingStyle, PreparedDocument } from "./prepared-material";

export function LearnerMaterials({ missionId, versionId }: { missionId: string; versionId: string }) {
  const [items, setItems] = useState<ApiResponse<"learnerMaterials">["items"] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { setItems(null); setError(""); setRetry(0); }, [missionId, versionId]);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void api("learnerMaterials", { params: { id: missionId }, query: { versionId }, signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setItems(value.items); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); });
    return () => controller.abort();
  }, [missionId, versionId, retry]);
  useEffect(() => {
    if (!items?.some(item => item.scope === "activity" && item.status === "processing")) return;
    const timer = window.setTimeout(() => setRetry(value => value + 1), 5000);
    return () => window.clearTimeout(timer);
  }, [items]);

  return <section className="mission-supports" aria-labelledby="learner-materials-title">
    <h3 id="learner-materials-title" tabIndex={-1}>PDFs da atividade e apoios para você</h3>
    {error ? <>
      <p role="alert">Não foi possível consultar os materiais da atividade. {error}</p>
      <button className="text-button" onClick={() => setRetry(n => n + 1)}>Consultar materiais novamente</button>
    </> : items === null ? <p role="status">Consultando materiais da atividade…</p>
      : items.length === 0 ? <p role="status">Esta versão ainda não tem PDFs ou apoios preparados.</p>
      : <>
        <p role="status">{items.length === 1 ? "1 material disponível." : `${items.length} materiais disponíveis.`}</p>
        <p className="small">Os PDFs anexados à atividade aparecem para toda a turma. Apoios preparados pelo professor também aparecem aqui.</p>
        {items.map(item => <article className="material-library-item" key={item.id}>
          <h4>{item.title}</h4>
          {item.expiresAt && <p className="small">Disponível até {new Date(item.expiresAt).toLocaleDateString("pt-BR")}.</p>}
          {item.status === "processing" ? <p role="status">PDF da atividade em processamento. Esta área será atualizada automaticamente.</p>
            : item.status === "failed" ? <p role="status">Não foi possível preparar este PDF para visualização. Avise o professor da turma.</p>
            : item.scope === "activity" ? <p>PDF anexado à atividade para todos os alunos da turma.</p>
            : item.mode === "original" ? <p>PDF original disponibilizado pelo professor, sem alterações.</p>
            : <div className={item.reading ? "comparison-paper" : undefined} data-color={item.reading?.color} style={item.reading ? materialReadingStyle(item.reading) : undefined}>
              <PreparedDocument document={item.document} missionId={missionId} adaptationId={item.id} />
            </div>}
          {item.status !== "processing" && item.status !== "failed" && <>
            <iframe
              className="learner-material-pdf"
              title={`Prévia do PDF: ${item.title}`}
              src={materialAssetUrl(missionId, item.id, "pdf")}
              loading="lazy"
            />
            <a className="button button-outline" href={materialAssetUrl(missionId, item.id, "pdf")} download>
              {item.scope === "activity" ? "Baixar PDF da atividade" : item.mode === "original" ? "Baixar PDF original" : "Baixar PDF adaptado"}
            </a>
            <a className="text-link" href={materialAssetUrl(missionId, item.id, "pdf")} target="_blank" rel="noopener noreferrer">
              Abrir PDF em nova aba
            </a>
            {item.hasAudio && <div className="form-stack">
              <p>Áudio do material. As descrições visuais estão no texto acima.</p>
              <audio controls preload="none" aria-label={`Ouvir ${item.title}`} src={materialAssetUrl(missionId, item.id, "audio")} />
              <a className="text-link" href={materialAssetUrl(missionId, item.id, "audio")} download>Baixar áudio do material</a>
            </div>}
          </>}
        </article>)}
      </>}
  </section>;
}
