import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ApiBody, ApiResponse } from '../../apps/web/lib/api.generated';
import { materialPdfFixture } from '../../scripts/material-fixture.mjs';

async function fixture(page: Page) {
  const version = { id:'v-material',missionId:'m-material',title:'Comparar rotas acessíveis',description:'Material fictício.',objectives:['Comparar rotas.'],criteria:['Justificar escolha.'],source:'manual',dueAt:null,createdAt:'2026-11-01T00:00:00.000Z',materials:[],steps:[{id:'s-material',position:1,title:'Comparar',instructions:'Compare duas rotas.',example:'Use distâncias.'}] };
  const source: ApiResponse<'uploadMaterialSource'> = { id:'source-material',versionId:version.id,title:'rotas.pdf',status:'ready',pageCount:1,pages:[{page:1,text:'Compare duas rotas de 10 metros.',hasVisual:true,ocr:false}],warnings:['Confira a informação visual.'],expiresAt:'2027-01-30T00:00:00.000Z' };
  let sources: ApiResponse<'materialSources'>['items']=[], plans: ApiResponse<'prepareMaterial'>[]=[];
  let sent: ApiBody<'prepareMaterial'> | undefined;
  await page.route('**/api/v1/**',async route=>{
    const path=new URL(route.request().url()).pathname.slice('/api/v1'.length), method=route.request().method();
    const respond=(json:unknown)=>route.fulfill({json});
    if(path==='/me')return respond({id:'teacher-material',name:'Professora fictícia',email:'teacher@example.invalid',demo:true,course:null,preferences:{}});
    if(path==='/classrooms')return respond({items:[{id:'c-material',name:'Turma fictícia',role:'teacher'}],nextCursor:null});
    if(path==='/classrooms/c-material/missions')return respond({items:[{id:version.missionId,classroomId:'c-material',status:'published',publishedVersion:version,draftVersion:null}],nextCursor:null});
    if(path.endsWith('/submissions'))return respond({items:[],nextCursor:null});
    if(path.endsWith('/learning-needs'))return respond({items:[{userId:'student-a',name:'Marina fictícia',supports:['short-steps'],preferredFormats:[],disabilities:['low-vision']}],nextCursor:null});
    if(path.endsWith('/strategy-recipients'))return respond({items:[{id:'student-a',name:'Marina fictícia'},{id:'student-b',name:'Aluno B'}],nextCursor:null});
    if(path.endsWith('/adaptations')) return respond({items:[]});
    if(path==='/strategies'||path.endsWith('/strategy-plans'))return respond({items:[]});
    if(path.endsWith('/material-sources')){if(method==='POST'){sources=[source];return respond(source);}return respond({items:sources});}
    if(path.endsWith('/material-adaptations')){
      if(method==='POST'){sent=route.request().postDataJSON();plans=[{id:'adaptation-material',versionId:version.id,sourceId:source.id,studentId:sent!.studentId,settings:sent!.settings,pages:[1],document:[{page:1,title:'Compare as rotas',text:'Compare as rotas de 10 metros.',description:'O diagrama compara duas rotas.'}],status:'draft',revision:1,error:null,hasAudio:false,inputTokens:120,outputTokens:60,expiresAt:source.expiresAt}];return respond(plans[0]);}return respond({items:plans});
    }
    if(path.endsWith('/material-adaptations/adaptation-material')&&method==='PATCH'){const body=route.request().postDataJSON();plans[0]={...plans[0],document:body.document,revision:2,status:'draft'};return respond(plans[0]);}
    if(path.endsWith('/render')){plans[0]={...plans[0],status:'ready',hasAudio:plans[0].settings.supports.includes('narration')};return respond(plans[0]);}
    if(path.endsWith('/release')){plans[0]={...plans[0],status:'released'};return respond(plans[0]);}
    return route.fulfill({status:404,json:{}});
  });
  await page.goto('/professor/estrategias');
  await expect(page.getByRole('heading',{name:'Prepare o material para este aluno',exact:true})).toBeVisible();
  return ()=>sent;
}

test('professor prepara material individual, combina apoios, revisa e libera sem enviar perfil à IA',async({page})=>{
  const sent=await fixture(page);
  await page.getByLabel('Aluno da turma',{exact:true}).selectOption('student-a');
  await page.getByText('Usar sugestões por perfil informado',{exact:true}).click();
  await page.getByRole('checkbox',{name:'Baixa visão',exact:true}).check();
  await page.getByRole('checkbox',{name:'Transtorno do espectro autista (TEA)',exact:true}).check();
  await page.getByRole('button',{name:'Usar sugestões destes perfis',exact:true}).click();
  await page.getByRole('button',{name:'Continuar para o material →',exact:true}).click();
  await page.getByLabel('Adicionar arquivo PDF',{exact:true}).setInputFiles({name:'rotas.pdf',mimeType:'application/pdf',buffer:materialPdfFixture()});
  await expect(page.getByRole('status').filter({hasText:'Pronto para revisar'})).toBeVisible();
  await page.getByRole('checkbox',{name:/Página 1 ·/}).check();
  await page.getByRole('checkbox',{name:/Conferi que as páginas/}).check();
  await page.getByRole('button',{name:'Preparar rascunho para revisão →',exact:true}).click();
  await expect(page.getByLabel('Texto da página 1',{exact:true})).toBeVisible();
  expect(sent()?.studentId).toBe('student-a');expect(sent()?.settings.supports).toContain('literal-language');
  expect(JSON.stringify(sent())).not.toContain('autism');expect(JSON.stringify(sent())).not.toContain('Marina');expect(JSON.stringify(sent())).not.toContain('low-vision');
  await page.getByLabel('Texto da página 1',{exact:true}).fill('Texto revisado: compare duas rotas de 10 metros.');
  await page.screenshot({path:'test-results/reference-material-review.png',fullPage:true});
  await page.getByRole('button',{name:'Salvar revisão e gerar PDF →',exact:true}).click();
  await expect(page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true})).toBeDisabled();
  await page.getByRole('checkbox',{name:/Conferi o PDF, o conteúdo/}).check();
  await page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Material liberado',exact:true})).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});

test('apoios individuais: teclado, perfis opcionais e reflow estreito',async({page})=>{
  await page.setViewportSize({width:320,height:900});await fixture(page);
  await page.getByLabel('Aluno da turma',{exact:true}).selectOption('student-a');
  await page.getByRole('checkbox',{name:/Texto ampliado/}).focus();await page.keyboard.press('Space');
  await expect(page.getByRole('button',{name:'Continuar para o material →',exact:true})).toBeDisabled();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button',{name:'Continuar para o material →',exact:true})).toBeEnabled();
  await page.screenshot({path:'test-results/reference-material-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});
