import type { CSSProperties } from "react";
import type { ApiBody, ApiResponse } from "../lib/product-client";
type Document = ApiBody<"editMaterial">["document"];
type Reading = ApiResponse<"learnerMaterials">["items"][number]["reading"];

export function materialReadingStyle(settings: Reading, zoom = 1): CSSProperties {
  const size = settings?.supports.includes("large-print") ? Number(settings.fontSize) : 18;
  return { fontSize: `${size * zoom / 12}rem`, lineHeight: settings?.supports.includes("wide-spacing") ? 1.8 : 1.5 };
}

export function materialAssetUrl(missionId: string, assetId: string, kind: "original" | "pdf" | "audio" | `page-${number}`) {
  return `/api/v1/missions/${encodeURIComponent(missionId)}/material-assets/${encodeURIComponent(assetId)}/${kind}`;
}
export function PreparedDocument({ document, missionId, adaptationId }: { document: Document; missionId?: string; adaptationId?: string }) {
  return <>{document.map(page => (
    <section className="prepared-page" key={page.page}>
      <h4>{page.title}</h4>
      <p className="small">Página {page.page} do original</p>
      <p className="submission-content">{page.text}</p>
      {page.steps && <>
        <h5>Passos da atividade</h5>
        {page.steps.length ? <ol>{page.steps.map((step, index) => <li key={index}>{step}</li>)}</ol> : <p>Sem ações identificadas nesta página.</p>}
      </>}
      {page.glossary && <>
        <h5>Glossário</h5>
        {page.glossary.length ? <dl>{page.glossary.map(({term, definition}, index) => (
          <div key={index}><dt>{term}</dt><dd>{definition}</dd></div>
        ))}</dl> : <p>Sem termos selecionados nesta página.</p>}
      </>}
      {page.description && <>
        <h5>Descrição das informações visuais</h5>
        <p className="submission-content">{page.description}</p>
      </>}
      {missionId&&adaptationId&&<details>
        <summary>Consultar imagem da página original</summary>
        <a className="text-link" href={materialAssetUrl(missionId,adaptationId,`page-${page.page}`)} target="_blank" rel="noopener noreferrer">Abrir página {page.page} para ampliar</a>
        {page.description&&<p className="small">A descrição textual acima é a alternativa à informação visual.</p>}
      </details>}
    </section>
  ))}</>;
}
