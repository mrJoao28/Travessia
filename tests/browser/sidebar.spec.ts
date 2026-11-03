import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for(const role of ['professor','aluno'] as const){
 test(`menu de ${role} recolhe para ícones, mantém nomes, navegação e preferência`,async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(`/previa/${role}`);
  const sidebar=page.getByRole('complementary',{name:'Menu lateral'});
  const toggle=page.getByRole('button',{name:'Recolher menu',exact:true});await expect(toggle).toBeEnabled();
  const expanded=(await page.locator('.workspace').boundingBox())!.width;
  await expect(toggle).toHaveAttribute('aria-controls',(await sidebar.getAttribute('id'))!);
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await page.screenshot({path:`test-results/reference-sidebar-${role}-expanded.png`,fullPage:true});
  await toggle.click();const reopen=page.getByRole('button',{name:'Abrir menu',exact:true});await expect(reopen).toBeFocused();await expect(reopen).toHaveAttribute('aria-expanded','false');
  await expect(sidebar.locator('.sidebar-label').first()).toBeHidden();await expect(sidebar.getByRole('link',{name:'Travessia, início',exact:true})).toBeVisible();
  const active=sidebar.getByRole('link',{name:role==='professor'?'Minhas turmas':'Meu percurso',exact:true});await expect(active).toHaveAttribute('aria-current','page');
  expect((await page.locator('.workspace').boundingBox())!.width).toBeGreaterThan(expanded+100);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:`test-results/reference-sidebar-${role}-collapsed.png`,fullPage:true});
  await sidebar.getByRole('link',{name:'Entregas',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/previa/${role}/entregas$`));await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toBeEnabled();
  await page.reload();await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toHaveAttribute('aria-expanded','false');
  await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(page.getByRole('button',{name:'Recolher menu',exact:true})).toHaveAttribute('aria-expanded','true');
 });
}

test('teclado e dicas: Escape dispensa a dica, ponteiro pode alcançá-la e os atalhos continuam funcionando',async({page})=>{
 await page.goto('/previa/professor');const toggle=page.getByRole('button',{name:'Recolher menu',exact:true});await expect(toggle).toBeEnabled();await toggle.focus();await page.keyboard.press('Enter');
 const mission=page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:'Missões',exact:true});await mission.focus();
 const tooltip=page.locator('.navigation-tooltip').filter({hasText:/^Missões$/});await expect(tooltip).toBeVisible();await page.keyboard.press('Escape');await expect(tooltip).toHaveCount(0);await expect(mission).toBeFocused();
 await mission.hover();await expect(tooltip).toBeVisible();await tooltip.hover();await expect(tooltip).toBeVisible();await page.keyboard.press('Escape');await expect(tooltip).toHaveCount(0);
 await page.getByRole('complementary',{name:'Menu lateral'}).getByRole('link',{name:'Preferências de leitura',exact:true}).click();await expect(page.getByLabel('Tamanho do texto')).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'Ajuda',exact:true}).click();await expect(page).toHaveURL(/\/previa\/professor\/ajuda$/);await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toBeEnabled();
});

test('recolher o menu preserva rascunho, preferências de leitura e dados do cenário',async({page})=>{
 const requests:string[]=[];let dialogs=0;page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url());});page.on('dialog',async d=>{dialogs++;await d.dismiss();});
 await page.goto('/previa/professor/missoes/editor');await page.getByLabel('Título da missão',{exact:true}).fill('Rascunho fictício preservado');
 await page.getByRole('button',{name:'Recolher menu',exact:true}).click();await expect(page.getByLabel('Título da missão',{exact:true})).toHaveValue('Rascunho fictício preservado');
 await page.getByText('Aa · Ajustar leitura',{exact:true}).click();await page.locator('#temas > summary').click();await page.getByLabel('Mais contraste',{exact:true}).check();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(page.getByLabel('Título da missão',{exact:true})).toHaveValue('Rascunho fictício preservado');
 await expect(page.locator('html')).toHaveAttribute('data-contrast','true');expect(dialogs).toBe(0);expect(requests).toEqual([]);
});

test('armazenamento bloqueado não impede abrir e recolher',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked');};Storage.prototype.setItem=()=>{throw new Error('blocked');};});await page.goto('/previa/aluno');
 await page.getByRole('button',{name:'Recolher menu',exact:true}).click();await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(page.getByRole('button',{name:'Recolher menu',exact:true})).toBeEnabled();
});

for(const role of ['aluno','professor'] as const){
 test(`menu de ${role} em 320px, texto 200% e cores do sistema`,async({page})=>{
  await page.setViewportSize({width:320,height:850});await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.goto(`/previa/${role}`);await expect(page.getByRole('button',{name:'Recolher menu',exact:true})).toBeEnabled();
  await page.addStyleTag({content:'html {font-size:200% !important;}'});
  for(const compact of [false,true]){
   if(compact)await page.getByRole('button',{name:'Recolher menu',exact:true}).click();
   const help=page.getByRole('link',{name:'Ajuda',exact:true});await expect(help).toBeVisible();
   if(compact){await help.focus();await expect(page.locator('.navigation-tooltip').filter({hasText:/^Ajuda$/})).toBeVisible();}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
   await page.screenshot({path:`test-results/reference-sidebar-${role}-mobile-${compact?'icons':'expanded'}.png`,fullPage:true});
   await page.keyboard.press('Escape');
  }
 });
}


test('ativar o menu dispensa a dica e deixa Ajustar leitura disponível no celular',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/previa/aluno');
 const toggle=page.getByRole('button',{name:'Recolher menu',exact:true});await expect(toggle).toBeEnabled();
 await toggle.hover();await expect(page.locator('.navigation-tooltip').filter({hasText:/^Recolher menu$/})).toBeVisible();
 await toggle.click();await expect(page.locator('.navigation-tooltip')).toHaveCount(0);
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(page.locator('.navigation-tooltip')).toHaveCount(0);
 await page.locator('#preferencias > summary').click();await expect(page.getByLabel('Tamanho do texto')).toBeVisible();
});
