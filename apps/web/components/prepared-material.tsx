import type { ApiBody } from "../lib/product-client";
type Document = ApiBody<"editMaterial">["document"];
export function materialAssetUrl(missionId: string, assetId: string, kind: "original" | "pdf" | "audio" | `page-${number}`) {
  return `/api/v1/missions/${encodeURIComponent(missionId)}/material-assets/${encodeURIComponent(assetId)}/${kind}`;
}
export function PreparedDocument({ document, missionId, adaptationId }: { document: Document; missionId?: string; adaptationId?: string }) {
  return <>{document.map(page => <section className="prepared-page" key={page.page}><h4>{page.title}</h4><p className="small">Página {page.page} do original</p><p className="submission-content">{page.text}</p>{page.description && <><h5>Descrição das informações visuais</h5><p className="submission-content">{page.description}</p></>}{missionId&&adaptationId&&<details><summary>Consultar imagem da página original</summary><a className="text-link" href={materialAssetUrl(missionId,adaptationId,`page-${page.page}`)} target="_blank" rel="noopener noreferrer">Abrir página {page.page} para ampliar</a><p className="small">A descrição textual acima é a alternativa à informação visual.</p></details>}</section>)}</>;
}
