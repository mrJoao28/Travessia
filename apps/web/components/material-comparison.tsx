"use client";
import { useEffect, useState, type CSSProperties } from 'react';
import type { ApiResponse, ApiBody } from '../lib/product-client';
import { materialAssetUrl, PreparedDocument } from './prepared-material';

type Source = ApiResponse<'uploadMaterialSource'>;
type Adaptation = ApiResponse<'prepareMaterial'>;
type Document = ApiBody<'editMaterial'>['document'];

/** Private source images and semantic reading preview; the exported PDF remains available for review. */
export function MaterialComparison({missionId,source,adaptation,studentName,originalOnly,document,dirty,view,onViewChange}:{view:'original'|'prepared';onViewChange:(view:'original'|'prepared')=>void;missionId:string;source?:Source;adaptation?:Adaptation;studentName?:string;originalOnly:boolean;document:Document;dirty:boolean}) {
 const [page,setPage]=useState(1);
 const [zoom,setZoom]=useState(1),[imageFailed,setImageFailed]=useState(false);
 const current=adaptation?.sourceId===source?.id?adaptation:undefined;
 const ready=current&&['ready','released'].includes(current.status);
 const available=current?.document.length?current.document.map(p=>p.page):source?.pages.map(p=>p.page)??[];
 const shown=available.includes(page)?page:available[0]??1;
 const extracted=source?.pages.find(p=>p.page===shown);
 const prepared=document.find(p=>p.page===shown);
 useEffect(()=>{setPage(1);setZoom(1);setImageFailed(false);},[source?.id,current?.id]);
 useEffect(()=>{setImageFailed(false);},[shown]);
 useEffect(()=>{onViewChange(originalOnly?'original':'prepared');},[originalOnly,onViewChange]);
 const settings=current?.settings;
 const textStyle:CSSProperties={fontSize:`${settings?.supports.includes('large-print')?Number(settings.fontSize)*zoom:18*zoom}pt`,lineHeight:settings?.supports.includes('wide-spacing')?1.8:1.5};
 const colors=settings?.color??'default';
 const originalReady=source?.status==='ready';
 return <section className="material-comparison" aria-label="Comparação do material">
   <div className="comparison-toolbar">
     <div className="comparison-view-choice" role="group" aria-label="Documento exibido no celular"><button type="button" aria-pressed={view==='original'} onClick={()=>onViewChange('original')}>Original</button><button type="button" aria-pressed={view==='prepared'} onClick={()=>onViewChange('prepared')}>Preparado</button></div>
     {!!available.length&&<div className="comparison-page-control"><label htmlFor="comparison-page">Página do original</label><select id="comparison-page" value={shown} onChange={e=>setPage(Number(e.target.value))}>{available.map(p=><option key={p} value={p}>{p}</option>)}</select></div>}
     <div className="comparison-zoom" aria-label="Ampliar comparação"><button type="button" aria-label="Diminuir ampliação da comparação" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.25))}>−</button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Aumentar ampliação da comparação" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}>+</button></div>
   </div>
   <div className="comparison-documents" data-view={view}>
     <section id="material-original-view" className="comparison-document comparison-original" aria-label="Documento original">
       <header><h3>Original</h3>{originalReady&&<a className="text-link" href={materialAssetUrl(missionId,source!.id,'original')} target="_blank" rel="noopener noreferrer">Abrir PDF original</a>}</header>
       <div className="comparison-reader" role="region" aria-label="Leitura do documento original" tabIndex={0}>
         {originalReady?<>
           {!imageFailed&&<img className="comparison-source-page" style={{width:`${zoom*100}%`,maxWidth:'none'}} src={materialAssetUrl(missionId,source!.id,`page-${shown}`)} alt={`Página ${shown} do PDF original. O texto extraído está disponível logo abaixo.`} onError={()=>setImageFailed(true)}/>}
           {imageFailed&&<p className="notice">A imagem não carregou. Consulte o texto abaixo ou abra o PDF original.</p>}
           <details open={imageFailed}><summary>Texto extraído da página {shown}</summary><p className="submission-content">{extracted?.text||'Esta página não possui texto extraído. Confira o PDF original.'}</p></details>
         </>:<div className="comparison-empty"><span className="pdf-file-badge" aria-hidden="true">PDF</span><h4>{source?'Verificando o arquivo':'Seu material aparece aqui'}</h4><p>{source?.status==='failed'?'Escolha outro arquivo na lista.':source?'Aguarde a verificação antes de preparar.':'Adicione ou escolha um PDF no painel Arquivos.'}</p></div>}
       </div>
     </section>
     <section id="material-prepared-view" className="comparison-document comparison-prepared" aria-label="Documento preparado">
       <header><h3>{studentName?`Preparado para ${studentName}`:'Preparado para o aluno'}</h3>{dirty&&<span className="small">Alterações ainda não salvas</span>}</header>
       <div className="comparison-reader" role="region" aria-label="Leitura do documento preparado" tabIndex={0}>
         {originalOnly?<div className="comparison-empty"><span className="pdf-file-badge" aria-hidden="true">PDF</span><h4>O mesmo PDF, sem alterações</h4><p>Confira o original ao lado. A entrega continua exclusiva do aluno escolhido.</p></div>:(ready||dirty)&&prepared?<>
           <article className="comparison-paper" data-color={colors} style={textStyle}><PreparedDocument document={[prepared]}/></article>
           <p className="small comparison-preview-note">Prévia de leitura. Confira também a diagramação no PDF gerado antes de disponibilizar.</p>
         </>:<div className="comparison-empty"><span aria-hidden="true" className="comparison-preview-icon">Aa</span><h4>{current?'Preparando a leitura':'A versão preparada aparece aqui'}</h4><p>{current?.status==='failed'?'A preparação falhou. Consulte o aviso no painel de revisão.':current?'O resultado aparecerá depois do processamento.':'Escolha o aluno e os apoios no painel ao lado. Depois, prepare a prévia.'}</p></div>}
       </div>
     </section>
   </div>
 </section>;
}
