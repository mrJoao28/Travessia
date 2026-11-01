"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
import { materialAssetUrl, PreparedDocument } from "./prepared-material";
export function LearnerMaterials({ missionId, versionId }: { missionId: string; versionId: string }) {
  const [items,setItems]=useState<ApiResponse<"learnerMaterials">["items"]>([]),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;setItems([]);setError("");void api("learnerMaterials",{params:{id:missionId},query:{versionId}}).then(v=>{if(active)setItems(v.items);}).catch(reason=>{if(active)setError(errorMessage(reason));});return()=>{active=false;};},[missionId,versionId,retry]);
  if(error)return <section className="paper"><p role="alert">Não foi possível consultar seus materiais preparados. {error}</p><button className="text-button" onClick={()=>setRetry(n=>n+1)}>Consultar materiais novamente</button></section>;
  if(!items.length)return null;
  return <section className="mission-supports" aria-label="Materiais preparados para você"><h3>Materiais preparados para você</h3><p className="small">Use a leitura, o PDF ou o áudio que preferir.</p>{items.map(item=><details className="paper" key={item.id}><summary>{item.title}</summary>{item.mode==="original"?<p>PDF original disponibilizado pelo professor, sem alterações.</p>:<PreparedDocument document={item.document} missionId={missionId} adaptationId={item.id}/>}<a className="button button-outline" href={materialAssetUrl(missionId,item.id,"pdf")} download>{item.mode==="original"?"Baixar PDF original":"Baixar PDF adaptado"}</a>{item.hasAudio&&<div className="form-stack"><p>Áudio do material · a transcrição está no texto acima.</p><audio controls preload="none" aria-label={`Ouvir ${item.title}`} src={materialAssetUrl(missionId,item.id,"audio")}/><a className="text-link" href={materialAssetUrl(missionId,item.id,"audio")} download>Baixar áudio do material</a></div>}</details>)}</section>;
}
