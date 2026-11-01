import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ApiBody, ApiResponse } from '../../apps/web/lib/api.generated';
import { materialPdfFixture } from '../../scripts/material-fixture.mjs';

async function fixture(page: Page, failActivity = false, disabilities: string[] = ['low-vision'], requests: string[] = ['short-steps']) {
  const version = { id:'v-material',missionId:'m-material',title:'Comparar rotas acessíveis',description:'Material fictício.',objectives:['Comparar rotas.'],criteria:['Justificar escolha.'],source:'manual',dueAt:null,createdAt:'2026-11-01T00:00:00.000Z',materials:[],steps:[{id:'s-material',position:1,title:'Comparar',instructions:'Compare duas rotas.',example:'Use distâncias.'}] };
  const source: ApiResponse<'uploadMaterialSource'> = { id:'source-material',versionId:version.id,title:'rotas.pdf',status:'ready',pageCount:1,pages:[{page:1,text:'Compare duas rotas de 10 metros.',hasVisual:true,ocr:false}],warnings:['Confira a informação visual.'],expiresAt:'2027-01-30T00:00:00.000Z' };
  let sources: ApiResponse<'materialSources'>['items']=[], plans: ApiResponse<'prepareMaterial'>[]=[];
  let sent: ApiBody<'prepareMaterial'> | undefined;
  let activity: ApiBody<'createAdaptation'> | undefined;
  let original: ApiBody<'releaseOriginalMaterial'> | undefined;
  await page.route('**/api/v1/**',async route=>{
    const path=new URL(route.request().url()).pathname.slice('/api/v1'.length), method=route.request().method();
    const respond=(json:unknown)=>route.fulfill({json});
    if(path==='/me')return respond({id:'teacher-material',name:'Professora fictícia',email:'teacher@example.invalid',demo:true,course:null,preferences:{}});
    if(path==='/classrooms')return respond({items:[{id:'c-material',name:'Turma fictícia',role:'teacher'}],nextCursor:null});
    if(path==='/classrooms/c-material/missions')return respond({items:[{id:version.missionId,classroomId:'c-material',status:'published',publishedVersion:version,draftVersion:null}],nextCursor:null});
    if(path.endsWith('/submissions'))return respond({items:[],nextCursor:null});
    if(path.endsWith('/learning-needs'))return respond({items:[{userId:'student-a',name:'Marina fictícia',supports:requests,preferredFormats:[],disabilities}],nextCursor:null});
    if(path.endsWith('/strategy-recipients'))return respond({items:[{id:'student-a',name:'Marina fictícia'},{id:'student-b',name:'Aluno B'}],nextCursor:null});
    if(path.endsWith('/adaptations')) { if(method==='POST'){activity=route.request().postDataJSON();return failActivity?route.fulfill({status:409,json:{code:'REVISION_CONFLICT'}}):respond({...activity,id:'activity-material',revision:1});}return respond({items:[]}); }
    if(path==='/strategies'||path.endsWith('/strategy-plans'))return respond({items:[]});
    if(path.endsWith('/material-sources')){if(method==='POST'){sources=[source];return respond(source);}return respond({items:sources});}
    if(path.endsWith('/original-materials')){original=route.request().postDataJSON();plans=[{id:'original-material',mode:'original',versionId:version.id,sourceId:source.id,studentId:original!.studentId,settings:{supports:[],fontSize:'18',color:'default',useAi:false,approvedForProvider:false,deliveryMode:'original'},pages:[],document:[],status:'released',revision:1,error:null,hasAudio:false,inputTokens:0,outputTokens:0,expiresAt:source.expiresAt}];return respond(plans[0]);}
    if(path.endsWith('/material-adaptations')){
      if(method==='POST'){sent=route.request().postDataJSON();plans=[{id:'adaptation-material',versionId:version.id,sourceId:source.id,studentId:sent!.studentId,settings:sent!.settings,pages:[1],document:[{page:1,title:'Compare as rotas',text:'Compare as rotas de 10 metros.',description:'O diagrama compara duas rotas.'}],status:'draft',revision:1,error:null,hasAudio:false,inputTokens:120,outputTokens:60,expiresAt:source.expiresAt}];return respond(plans[0]);}return respond({items:plans});
    }
    if(path.endsWith('/material-adaptations/adaptation-material')&&method==='PATCH'){const body=route.request().postDataJSON();plans[0]={...plans[0],document:body.document,revision:2,status:'draft'};return respond(plans[0]);}
    if(path.endsWith('/render')){plans[0]={...plans[0],status:'ready',hasAudio:plans[0].settings.supports.includes('narration')};return respond(plans[0]);}
    if(path.endsWith('/release')){plans[0]={...plans[0],status:'released'};return respond(plans[0]);}
    return route.fulfill({status:404,json:{}});
  });
  await page.goto('/professor/estrategias');
  await expect(page.getByRole('heading',{name:'Preparar material para um aluno',exact:true})).toBeVisible();
  return Object.assign(()=>sent,{activity:()=>activity,original:()=>original});
}

async function addPdf(page:Page,student='student-a'){
 await page.getByLabel('Aluno da turma',{exact:true}).selectOption(student);
 await page.getByLabel('Adicionar arquivo PDF',{exact:true}).setInputFiles({name:'rotas.pdf',mimeType:'application/pdf',buffer:materialPdfFixture()});
 await expect(page.getByText('Arquivo adicionado · 1 páginas',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Continuar →',exact:true}).click();
}
test('sem deficiência informada: mantém original por padrão, permite apoio e exige revisão do destinatário',async({page})=>{
 const captured=await fixture(page,false,[],[]);await addPdf(page);
 await expect(page.getByText('Nenhuma deficiência informada',{exact:true})).toBeVisible();
 await expect(page.getByRole('radio',{name:/Manter o PDF original/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Texto ampliado/})).toHaveCount(0);
 await page.screenshot({path:'test-results/reference-material-no-disclosure.png',fullPage:true});
 await page.getByRole('radio',{name:/Preparar uma versão com apoio/}).check();
 await expect(page.getByRole('checkbox',{name:/Facilitar a leitura/})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Ouvir o material/})).toBeVisible();
 await page.getByRole('radio',{name:/Manter o PDF original/}).check();
 await page.getByRole('button',{name:'Continuar →',exact:true}).click();
 const send=page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true});await expect(send).toBeDisabled();
 await page.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();await send.click();
 await expect(page.getByRole('heading',{name:'Material disponibilizado',exact:true})).toBeVisible();
 expect(captured()).toBeUndefined();expect(captured.original()?.studentId).toBe('student-a');expect(captured.original()?.reviewed).toBe(true);
});
test('TEA compartilhado: somente sugestões pertinentes, prévia automática e revisão sem enviar perfil à IA',async({page})=>{
 const captured=await fixture(page,false,['autism'],[]);await addPdf(page);
 await expect(page.getByRole('checkbox',{name:/Explicação mais direta/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Passos curtos e numerados/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Explicar termos do material/})).not.toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Texto ampliado/})).toHaveCount(0);
 await page.screenshot({path:'test-results/reference-material-tea.png',fullPage:true});
 await page.getByRole('checkbox',{name:/Conferi as páginas e os objetivos/}).check();await page.getByRole('button',{name:'Preparar prévia →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible();
 expect(captured()?.settings.supports).toEqual(['literal-language','short-sections']);
 expect(JSON.stringify(captured())).not.toMatch(/autism|Marina|low-vision/);
 await page.getByText('Ajustar o texto da prévia',{exact:true}).click();
 await page.getByLabel('Texto da página 1',{exact:true}).fill('Texto revisado: compare duas rotas de 10 metros.');
 await expect(page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Atualizar prévia →',exact:true}).click();
 await page.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();await page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Material disponibilizado',exact:true})).toBeVisible();
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});
test('baixa visão: leitura em destaque, outros pedidos recolhidos, teclado e reflow',async({page})=>{
 await page.setViewportSize({width:320,height:900});await fixture(page);await addPdf(page);
 const large=page.getByRole('checkbox',{name:/Texto ampliado/});await expect(large).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Passos curtos e numerados/})).not.toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Explicar termos/})).toHaveCount(0);
 await large.focus();await page.keyboard.press('Space');await expect(large).not.toBeChecked();await page.keyboard.press('Space');
 await page.screenshot({path:'test-results/reference-material-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});
test('pedido de apoio sem compartilhar diagnóstico também orienta a preparação',async({page})=>{
 await fixture(page,false,[],['short-steps']);await addPdf(page);
 await expect(page.getByText('Nenhuma deficiência informada',{exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Passos curtos e numerados/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Texto ampliado/})).toHaveCount(0);
});
test('adaptação sem PDF mantém aluno e versão, salva formatos e exige revisão',async({page})=>{
 const captured=await fixture(page);await page.getByLabel('Aluno da turma',{exact:true}).selectOption('student-a');
 await page.getByRole('button',{name:'Ajustar atividade sem PDF',exact:true}).click();
 await page.getByLabel('Instruções preparadas para Marina fictícia',{exact:true}).fill('Compare uma rota por vez e explique sua escolha.');
 await page.getByRole('checkbox',{name:'Áudio de até 30 segundos',exact:true}).check();
 const save=page.getByRole('button',{name:'Salvar ajustes da atividade deste aluno',exact:true});await expect(save).toBeDisabled();
 await page.getByRole('checkbox',{name:/Conferi as instruções e as formas de entrega/}).check();await save.click();
 await expect(page.getByRole('status').filter({hasText:'Atividade e formas de entrega salvas'})).toBeVisible();
 expect(captured.activity()?.studentIds).toEqual(['student-a']);expect(captured.activity()?.versionId).toBe('v-material');expect(captured.activity()?.allowedFormats).toEqual(['text','audio']);
 await page.getByRole('button',{name:'Concluir ajustes deste aluno →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Ajustes preparados para Marina fictícia',exact:true})).toBeVisible();
});
test('falha ao salvar ajuste individual preserva enunciado e permite corrigir',async({page})=>{
 await fixture(page,true);await page.getByLabel('Aluno da turma',{exact:true}).selectOption('student-a');
 await page.getByRole('button',{name:'Ajustar atividade sem PDF',exact:true}).click();
 const field=page.getByLabel('Instruções preparadas para Marina fictícia',{exact:true});await field.fill('Texto que precisa ser preservado.');
 await page.getByRole('checkbox',{name:/Conferi as instruções e as formas de entrega/}).check();await page.getByRole('button',{name:'Salvar ajustes da atividade deste aluno',exact:true}).click();
 await expect(page.getByRole('main').getByRole('alert')).toContainText('O conteúdo mudou');await expect(field).toHaveValue('Texto que precisa ser preservado.');
 await field.fill('Texto preservado e corrigido.');await expect(page.getByRole('checkbox',{name:/Conferi as instruções e as formas de entrega/})).not.toBeChecked();
 await expect(page.getByRole('button',{name:'Concluir ajustes deste aluno →',exact:true})).toBeDisabled();
});
