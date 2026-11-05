import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for(const role of ['professor','aluno'] as const){
 for(const profile of [{width:320,height:700},{width:390,height:844},{width:705,height:607},{width:844,height:390},{width:1024,height:768}]){
  test(`menu ${role} ${profile.width}×${profile.height}: cabeçalho curto, foco e navegação`,async({page})=>{
   await page.setViewportSize(profile);await page.goto(`/previa/${role}`);
   const open=page.getByRole('button',{name:'Abrir menu',exact:true});await expect(open).toBeEnabled();
   await expect(page.getByRole('complementary',{name:'Menu lateral'})).toBeHidden();
   expect((await page.locator('.topbar').boundingBox())!.height).toBeLessThanOrEqual(150);
   expect((await page.locator('main').boundingBox())!.y).toBeLessThanOrEqual(200);
   const context=await page.locator('.workspace-context').boundingBox();expect(context!.width).toBeGreaterThanOrEqual(240);expect(context!.height).toBeLessThanOrEqual(60);
   await page.screenshot({path:test.info().outputPath('header-closed.png')});
   await open.click();const menu=page.getByRole('dialog',{name:'Menu',exact:true});
   const close=menu.getByRole('button',{name:'Fechar menu',exact:true});
   await expect(close).toBeFocused();await expect(open).toHaveAttribute('aria-expanded','true');
   expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
   await page.locator('main').evaluate(node=>(node as HTMLElement).focus());await expect(close).toBeFocused();
   await page.keyboard.press('Shift+Tab');await expect(menu.getByRole('link',{name:'Ajuda e orientações',exact:true})).toBeFocused();
   await page.keyboard.press('Tab');await expect(close).toBeFocused();
   const links=menu.getByRole('navigation',{name:'Navegação principal'}).getByRole('link');
   for(const link of await links.all()){
    const box=(await link.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(profile.width);
    expect(box.height).toBeGreaterThanOrEqual(44);
   }
   expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
   await page.screenshot({path:test.info().outputPath('menu-open.png')});
   await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(open).toBeFocused();
   expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
   await open.click();await menu.getByRole('link',{name:'Entregas',exact:true}).click();
   await expect(page).toHaveURL(new RegExp(`/previa/${role}/entregas$`));await expect(menu).toBeHidden();
   await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toHaveAttribute('aria-expanded','false');
  });
 }
}

test('705px escuro e 200%: contexto não vira coluna de letras; ajustes ficam no menu',async({page})=>{
 await page.setViewportSize({width:705,height:607});await page.addInitScript(()=>localStorage.setItem('travessia:reading:v1',JSON.stringify({theme:'dark',scale:'1.25'})));
 await page.goto('/previa/professor');const open=page.getByRole('button',{name:'Abrir menu',exact:true});await expect(open).toBeEnabled();
 await page.addStyleTag({content:'html{font-size:200%!important}'});
 const context=(await page.locator('.workspace-context').boundingBox())!;
 expect(context.width).toBeGreaterThan(500);expect(context.height).toBeLessThanOrEqual(80);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(705);
 await expect(page.locator('.topbar #preferencias')).toHaveCount(0);await expect(page.locator('.topbar #temas')).toHaveCount(0);
 await page.screenshot({path:test.info().outputPath('teacher-dark-705.png')});
 await open.click();const menu=page.getByRole('dialog',{name:'Menu',exact:true});
 await menu.locator('#preferencias > summary').click();await expect(menu.getByLabel('Tamanho do texto')).toBeVisible();
 await page.screenshot({path:test.info().outputPath('teacher-dark-settings.png')});
 await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(open).toBeFocused();
});

test('menu não altera a faixa de ícones do computador; redimensionar fecha e libera a página',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('travessia:sidebar:v1','collapsed'));
 await page.setViewportSize({width:390,height:844});await page.goto('/previa/aluno');
 const open=page.getByRole('button',{name:'Abrir menu',exact:true});await expect(open).toBeEnabled();await open.click();
 await page.setViewportSize({width:1440,height:900});await expect(page.getByRole('dialog',{name:'Menu',exact:true})).toHaveCount(0);
 await expect(page.getByRole('complementary',{name:'Menu lateral'})).toBeVisible();
 expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 expect(await page.evaluate(()=>localStorage.getItem('travessia:sidebar:v1'))).toBe('collapsed');
 await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).not.toHaveAttribute('aria-haspopup','dialog');
 await page.setViewportSize({width:390,height:844});await expect(open).toHaveAttribute('aria-haspopup','dialog');await expect(open).toHaveAttribute('aria-expanded','false');
 await open.click();const menu=page.getByRole('dialog',{name:'Menu',exact:true});await menu.getByRole('button',{name:'Fechar menu',exact:true}).click();await expect(open).toBeFocused();
});

test('o menu do aluno no celular abre ajustes de leitura e mantém Escape',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/previa/aluno');
 await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toBeEnabled();
 const trigger=page.getByRole('button',{name:'Abrir menu',exact:true});await trigger.click();
 const menu=page.getByRole('dialog',{name:'Menu',exact:true});await expect(menu).toBeVisible();
 await menu.locator('#preferencias > summary').click();
 await expect(menu.getByLabel('Tamanho do texto')).toBeVisible();
 await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(trigger).toBeFocused();
});
