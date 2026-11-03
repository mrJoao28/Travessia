import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Controlled loader exercises the integration and sandbox, not translation quality.
const loader=`const button=document.createElement('button');button.textContent='Ativar avatar de teste';document.body.appendChild(button);window.VLibrasWidget={initBtn:button};`;
async function mock(page:Page,fail=false){
 let calls=0;
 await page.route('https://vlibras.gov.br/app/vlibras-plugin.js',async route=>{calls++;if(fail&&calls===1)return route.abort();await route.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:loader});});
 await page.route('https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/**',route=>route.fulfill({contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:loader}));
 return ()=>calls;
}
async function open(page:Page){await page.getByRole('button',{name:'Libras para navegação',exact:true}).click();return page.getByRole('dialog',{name:'Libras para navegação',exact:true});}

for(const path of ['/login','/previa/professor','/previa/aluno']){
 test(`Libras em ${path}: opt-in, fechamento, retorno de foco e uma instância`,async({page})=>{
  const calls=await mock(page);await page.goto(path);
  const launcher=page.getByRole('button',{name:'Libras para navegação',exact:true});await expect(launcher).toHaveCount(1);
  expect(calls()).toBe(0);const dialog=await open(page);await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Fechar Libras',exact:true})).toBeFocused();expect(calls()).toBe(0);
  await dialog.getByRole('button',{name:'Ativar VLibras',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Guia disponível');expect(calls()).toBe(1);
  const frame=dialog.locator('iframe');await expect(frame).toHaveAttribute('sandbox','allow-scripts');await expect(frame).toHaveAttribute('referrerpolicy','no-referrer');
  expect(await page.evaluate(()=>Boolean((window as unknown as {VLibrasWidget?:unknown}).VLibrasWidget))).toBe(false);
  await dialog.getByRole('button',{name:'Fechar Libras',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(launcher).toBeFocused();await expect(page.locator('iframe[title="Guia de navegação com VLibras"]')).toHaveCount(0);
  await open(page);expect(calls()).toBe(1);await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(launcher).toBeFocused();
 });
}

test('quadro isolado não lê pai, dados da conta, rascunho, query ou seleção',async({page})=>{
 await mock(page);await page.goto('/previa/professor/missoes/editor?private=PRIVATE_QUERY');
 const input=page.getByLabel('Título da missão',{exact:true});await input.fill('PRIVATE_MATERIAL_MARKER');
 await page.evaluate(()=>{localStorage.setItem('private-marker','PRIVATE_ACCOUNT_MARKER');const p=document.createElement('p');p.id='private-fixture';p.textContent='PRIVATE_REPORT_MARKER';document.body.appendChild(p);const range=document.createRange();range.selectNodeContents(p);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);});
 await open(page);await page.getByRole('button',{name:'Ativar VLibras',exact:true}).click();await expect(page.getByRole('dialog').getByRole('status')).toContainText('Guia disponível');
 const iframe=page.locator('iframe[title="Guia de navegação com VLibras"]');const doc=await iframe.getAttribute('srcdoc');expect(doc).not.toMatch(/PRIVATE_|Marina|Ana Paula/);
 const child=await iframe.elementHandle().then(h=>h!.contentFrame());expect(await child!.evaluate(()=>{let parentBlocked=false,storageBlocked=false;try{void window.parent.document.body.textContent;}catch{parentBlocked=true;}try{void window.parent.localStorage.getItem('private-marker');}catch{storageBlocked=true;}return {parent:parentBlocked,storage:storageBlocked};})).toEqual({parent:true,storage:true});
 await page.evaluate(()=>window.postMessage({channel:'travessia-navigation-libras',state:'close',token:'forged'},'*'));await expect(page.getByRole('dialog')).toBeVisible();
 await child!.getByRole('button',{name:/^Missões/}).focus();await child!.press('body','Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(input).toHaveValue('PRIVATE_MATERIAL_MARKER');
 await page.getByRole('button',{name:'Recolher menu',exact:true}).click();await open(page);await page.getByRole('button',{name:'Fechar Libras',exact:true}).click();await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toBeVisible();
});

test('falha externa permite tentar novamente e fechar sem bloquear navegação',async({page})=>{
 const calls=await mock(page,true);await page.goto('/previa/aluno');const dialog=await open(page);
 await dialog.getByRole('button',{name:'Ativar VLibras',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Não foi possível carregar');await expect(dialog.locator('iframe')).toHaveCount(0);
 const retry=dialog.getByRole('button',{name:'Tentar carregar VLibras novamente',exact:true});await expect(retry).toBeFocused();await retry.click();await expect(dialog.getByRole('status')).toContainText('Guia disponível');expect(calls()).toBe(2);
 await dialog.getByRole('button',{name:'Fechar e voltar à plataforma',exact:true}).click();await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:'Entregas',exact:true}).click();await expect(page).toHaveURL(/\/previa\/aluno\/entregas$/);await expect(page.getByRole('button',{name:'Libras para navegação',exact:true})).toHaveCount(1);
});

for(const theme of ['light','dark'] as const){
 test(`painel ${theme}: reflow, texto ampliado, cores do sistema e axe`,async({page})=>{
  await mock(page);await page.setViewportSize({width:theme==='dark'?320:1440,height:900});await page.goto('/previa/professor');await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
  if(theme==='dark'){await page.addStyleTag({content:'html{font-size:200%!important}'});await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});}
  const dialog=await open(page);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:`test-results/reference-libras-${theme}-before-activation.png`,fullPage:true});
  await dialog.getByRole('button',{name:'Ativar VLibras',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Guia disponível');
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  const closeBox=(await dialog.getByRole('button',{name:'Fechar Libras',exact:true}).boundingBox())!;expect(closeBox.y).toBeGreaterThanOrEqual(0);expect(closeBox.y+closeBox.height).toBeLessThanOrEqual(900);
  const frame=page.frameLocator('iframe[title="Guia de navegação com VLibras"]');await expect(frame.getByRole('button',{name:/^Preferências de leitura/})).toBeVisible();
  expect(await frame.locator('html').evaluate(el=>el.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:`test-results/reference-libras-${theme}-guide.png`,fullPage:true});
 });
}


test('falha da tradução real é anunciada sem liberar captura da página',async({page})=>{
 await mock(page);await page.route('https://traducao2.vlibras.gov.br/translate',r=>r.abort());await page.goto('/previa/aluno');const dialog=await open(page);await dialog.getByRole('button',{name:'Ativar VLibras',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Guia disponível');
 const child=await page.locator('iframe[title="Guia de navegação com VLibras"]').elementHandle().then(h=>h!.contentFrame());
 await child!.evaluate(()=>{void fetch('https://traducao2.vlibras.gov.br/translate',{method:'POST',body:JSON.stringify({text:'Ajuda'})}).catch(()=>{});});
 await expect(dialog.getByRole('alert')).toContainText('serviço externo pode estar indisponível');await expect(dialog.locator('iframe')).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Tentar carregar VLibras novamente',exact:true})).toBeFocused();
});
