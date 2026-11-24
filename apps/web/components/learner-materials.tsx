"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
import { materialAssetUrl, materialReadingStyle, PreparedDocument } from "./prepared-material";

function LearnerPdfPreview({ missionId, assetId, title, downloadAllowed, downloadLabel, previewPages }: { missionId:string; assetId:string; title:string; downloadAllowed:boolean; downloadLabel:string; previewPages:number[] }) {
  const [assetState,setAssetState]=useState<"checking"|"available"|"failed">("checking");
  const [frameLoaded,setFrameLoaded]=useState(false);
  const [loadedPages,setLoadedPages]=useState<number[]>([]);
  const [failedPages,setFailedPages]=useState<number[]>([]);
  const url=materialAssetUrl(missionId,assetId,"pdf");
  useEffect(()=>{
    setAssetState(downloadAllowed ? "checking" : previewPages.length ? "available" : "failed");
    setFrameLoaded(false);setLoadedPages([]);setFailedPages([]);
    if(!downloadAllowed)return;
    const controller=new AbortController();
    void fetch(url,{method:"HEAD",signal:controller.signal}).then(response=>{
      if(!controller.signal.aborted)setAssetState(response.ok?"available":"failed");
    }).catch(()=>{if(!controller.signal.aborted)setAssetState("failed");});
    return ()=>controller.abort();
  },[url,downloadAllowed,previewPages.length]);
  return <div className="form-stack">
    {downloadAllowed ? <>
      {assetState !== "failed" && <iframe className="learner-material-pdf" title={`Prévia do PDF: ${title}`} src={url} loading="lazy" onLoad={()=>setFrameLoaded(true)} onError={()=>setAssetState("failed")} />}
      {assetState === "checking" ? <p role="status">Verificando se o PDF pode ser aberto…</p>
        : assetState === "failed" ? <p role="alert">Não foi possível carregar a prévia do PDF. Avise o professor da turma.</p>
        : frameLoaded ? <p role="status">O PDF foi carregado no visualizador do navegador.</p>
        : <p role="status">O arquivo está disponível e a prévia está sendo aberta…</p>}
    </> : <>
      {previewPages.length > 0 && <div className="learner-page-preview" aria-label={`Prévia visual de ${title}`}>
        {previewPages.map(page=><figure className="prepared-page" key={page}>
          <figcaption>Página {page}</figcaption>
          <img src={materialAssetUrl(missionId,assetId,`page-${page}`)} alt={`Página ${page} do documento ${title}`} onLoad={()=>setLoadedPages(pages=>pages.includes(page)?pages:[...pages,page])} onError={()=>setFailedPages(pages=>pages.includes(page)?pages:[...pages,page])}/>
        </figure>)}
      </div>}
      {previewPages.length===0 ? <p role="status">Não foi possível preparar uma prévia visual deste PDF. O arquivo original não está disponível para download.</p>
        : failedPages.length>0 ? <p role="alert">Não foi possível carregar todas as páginas da prévia. Avise o professor da turma.</p>
        : loadedPages.length===previewPages.length ? <p role="status">As páginas foram carregadas para leitura. O arquivo PDF original não está disponível para download.</p>
        : <p role="status">Carregando as páginas da prévia…</p>}
    </>}
    <section className="paper form-stack" aria-label="Download do documento">
      <h5>Download do documento</h5>
      {downloadAllowed ? <a className="button button-outline" href={materialAssetUrl(missionId,assetId,"download")}>{downloadLabel}</a>
        : <p className="small">O professor não disponibilizou o botão de download. A prévia continua disponível no site.</p>}
    </section>
  </div>;
}

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
    <h3 id="learner-materials-title" tabIndex={-1}>PDFs e materiais da atividade</h3>
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
          {item.status === "processing" ? <p role="status">PDF recebido. Estamos verificando o arquivo; esta área será atualizada automaticamente.</p>
            : item.status === "failed" ? <p role="status">O PDF foi recebido, mas não foi possível verificar ou extrair o texto. Vamos tentar mostrar o arquivo original abaixo; avise o professor se a prévia não abrir.</p>
            : item.scope === "activity" ? <p role="status">PDF carregado e verificado. Ele está anexado à atividade para toda a turma.</p>
            : item.mode === "original" ? <p>PDF original disponibilizado pelo professor, sem alterações.</p>
            : <div className={item.reading ? "comparison-paper" : undefined} data-color={item.reading?.color} style={item.reading ? materialReadingStyle(item.reading) : undefined}>
              <PreparedDocument document={item.document} missionId={missionId} adaptationId={item.id} />
            </div>}
          {item.status !== "processing" && <>
            <LearnerPdfPreview missionId={missionId} assetId={item.id} title={item.title} downloadAllowed={item.downloadAllowed} previewPages={item.previewPages}
              downloadLabel={item.scope === "activity" ? "Baixar PDF da atividade" : item.mode === "original" ? "Baixar PDF original" : "Baixar PDF adaptado"} />
            {item.downloadAllowed && <a className="text-link" href={materialAssetUrl(missionId, item.id, "pdf")} target="_blank" rel="noopener noreferrer">
              Abrir PDF em nova aba
            </a>}
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
