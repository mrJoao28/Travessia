import {expect,type Page} from '@playwright/test';
import type { ApiBody, ApiResponse } from '../../apps/web/lib/api.generated';
import { materialPdfFixture } from '../../scripts/material-fixture.mjs';

export async function fixture(page: Page, failActivity = false, disabilities: string[] = ['low-vision'], requests: string[] = ['short-steps'], backgroundWork=false) {
  const version = { id:'v-material',missionId:'m-material',title:'Comparar rotas acessíveis',description:'Material fictício.',objectives:['Comparar rotas.'],criteria:['Justificar escolha.'],source:'manual',dueAt:null,createdAt:'2026-11-01T00:00:00.000Z',materials:[],steps:[{id:'s-material',position:1,title:'Comparar',instructions:'Compare duas rotas.',example:'Use distâncias.'}] };
  const source: ApiResponse<'uploadMaterialSource'> = { id:'source-material',versionId:version.id,title:'rotas.pdf',status:'ready',pageCount:1,pages:[{page:1,text:'Compare duas rotas de 10 metros.',hasVisual:true,ocr:false}],warnings:['Confira a informação visual.'],expiresAt:'2027-01-30T00:00:00.000Z' };
  let sources: ApiResponse<'materialSources'>['items']=[], plans: ApiResponse<'prepareMaterial'>[]=[];
  let sent: ApiBody<'prepareMaterial'> | undefined;
  let activity: ApiBody<'createAdaptation'> | undefined;
  let original: ApiBody<'releaseOriginalMaterial'> | undefined;
  await page.route('**/api/v1/**',async route=>{
    const path=new URL(route.request().url()).pathname.slice('/api/v1'.length), method=route.request().method();
    const respond=(json:unknown)=>route.fulfill({json});
    if(path.endsWith('/material-assets/source-material/page-1'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840"><rect width="600" height="840" fill="white"/><text x="50" y="90" fill="#173651" font-size="28">Compare as rotas</text><text x="50" y="145" font-size="18">Compare duas rotas de 10 metros.</text></svg>'});
    if(path==='/me')return respond({id:'teacher-material',name:'Professora fictícia',email:'teacher@example.invalid',demo:true,course:null,preferences:{}});
    if(path==='/classrooms')return respond({items:[{id:'c-material',name:'Turma fictícia',role:'teacher'}],nextCursor:null});
    if(path==='/classrooms/c-material/missions')return respond({items:[{id:version.missionId,classroomId:'c-material',status:'published',publishedVersion:version,draftVersion:null}],nextCursor:null});
    if(path.endsWith('/submissions'))return respond({items:[],nextCursor:null});
    if(path.endsWith('/learning-needs'))return respond({items:[{userId:'student-a',name:'Marina fictícia',supports:requests,preferredFormats:[],disabilities}],nextCursor:null});
    if(path.endsWith('/strategy-recipients'))return respond({items:[{id:'student-a',name:'Marina fictícia'},{id:'student-b',name:'Aluno B'}],nextCursor:null});
    if(path.endsWith('/adaptations')) { if(method==='POST'){activity=route.request().postDataJSON();return failActivity?route.fulfill({status:409,json:{code:'REVISION_CONFLICT'}}):respond({...activity,id:'activity-material',revision:1});}return respond({items:[]}); }
    if(path==='/strategies'||path.endsWith('/strategy-plans'))return respond({items:[]});
    if(path.endsWith('/material-sources')){if(method==='POST'){const file={...source,id:sources.length?'source-second':source.id,title:route.request().postDataJSON().title};sources=[...sources,file];return respond(file);}return respond({items:backgroundWork?[...sources,{...source,id:'background-source',status:'queued',pageCount:0,pages:[]}]:sources});}
    if(path.endsWith('/original-materials')){original=route.request().postDataJSON();plans=[{id:'original-material',mode:'original',versionId:version.id,sourceId:source.id,studentId:original!.studentId,settings:{supports:[],fontSize:'18',color:'default',useAi:false,approvedForProvider:false,deliveryMode:'original'},pages:[],document:[],status:'released',revision:1,error:null,hasAudio:false,inputTokens:0,outputTokens:0,expiresAt:source.expiresAt}];return respond(plans[0]);}
    if(path.endsWith('/material-adaptations')){
      if(method==='POST'){sent=route.request().postDataJSON();plans=[{id:'adaptation-material',versionId:version.id,sourceId:source.id,studentId:sent!.studentId,settings:sent!.settings,pages:[1],document:[{page:1,title:'Compare as rotas',text:'Compare as rotas de 10 metros.',description:'O diagrama compara duas rotas.'}],status:'draft',revision:1,error:null,hasAudio:false,inputTokens:120,outputTokens:60,expiresAt:source.expiresAt}];return respond(plans[0]);}return respond({items:backgroundWork&&plans[0]?[...plans,{...plans[0],id:'background-material',studentId:'student-b',status:'queued'}]:plans});
    }
    if(path.endsWith('/material-adaptations/adaptation-material')&&method==='PATCH'){const body=route.request().postDataJSON();plans[0]={...plans[0],document:body.document,revision:2,status:'draft'};return respond(plans[0]);}
    if(path.endsWith('/render')){plans[0]={...plans[0],status:'ready',hasAudio:plans[0].settings.supports.some(s=>s==='narration'||s==='image-description')};return respond(plans[0]);}
    if(path.endsWith('/release')){plans[0]={...plans[0],status:'released'};return respond(plans[0]);}
    return route.fulfill({status:404,json:{}});
  });
  await page.goto('/professor/estrategias');
  await expect(page.getByRole('heading',{name:'Preparar material para um aluno',exact:true})).toBeVisible();
  return Object.assign(()=>sent,{activity:()=>activity,original:()=>original});
}

export async function addPdf(page:Page,student='student-a'){
 await page.getByLabel('Aluno da turma',{exact:true}).selectOption(student);
 await page.getByLabel('Adicionar arquivo PDF',{exact:true}).setInputFiles({name:'rotas.pdf',mimeType:'application/pdf',buffer:materialPdfFixture()});
 await expect(page.getByText('Arquivo adicionado · 1 página',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Continuar →',exact:true}).click();
}
