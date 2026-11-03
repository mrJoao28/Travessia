import {test,expect,type Page} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import {fixture,addPdf} from '../fixtures/individual-materials';
import {fixture as productFixture} from '../fixtures/product-ui';
import {setup as profileFixture} from '../fixtures/profile';
const profiles=[
 {name:'phone-small',width:320,height:568},{name:'phone',width:360,height:800},
 {name:'phone-modern',width:390,height:844},{name:'phone-large',width:430,height:932},
 {name:'phone-landscape',width:844,height:390},{name:'tablet',width:768,height:1024},
 {name:'tablet-landscape',width:1024,height:768},{name:'laptop',width:1280,height:720},
 {name:'desktop',width:1440,height:900},{name:'full-hd',width:1920,height:1080},
 {name:'wide',width:2560,height:1440},{name:'text-200',width:320,height:700,large:true},
 {name:'dark-phone',width:390,height:844,dark:true},
 {name:'tablet-text-200',width:1024,height:768,large:true},{name:'laptop-text-200',width:1280,height:800,large:true},
];
async function measure(page:Page){
 await page.evaluate(()=>document.fonts.ready);
 return page.evaluate(()=>{
  const visible=(e:Element)=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
  const rect=(e:Element)=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};};
  const fields=[...document.querySelectorAll('main textarea,main input:not([type=checkbox]):not([type=radio]):not([type=hidden])')].filter(visible).map(e=>({label:e.getAttribute('aria-label')||e.id,...rect(e)}));
  const overflow=[...document.querySelectorAll('main *,header *,aside *')].filter(e=>visible(e)&&!e.closest('.comparison-reader')&&!e.classList.contains('sr-only')).filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,12).map(e=>({tag:e.tagName,classes:e.className,...rect(e)}));
  return {title:document.querySelector('h1')?.textContent,url:location.pathname,viewport:innerWidth,rootWidth:document.documentElement.scrollWidth,fields,overflow,
   navigation:document.querySelector('.sidebar')?rect(document.querySelector('.sidebar')!):null,
   readingPanels:[...document.querySelectorAll('.preferences-panel')].filter(visible).map(rect),
   documentPanels:[...document.querySelectorAll('.comparison-document')].filter(visible).map(rect)};
 });
}
for(const profile of profiles)test(`reflow ${profile.name}`,async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},colorScheme:profile.dark?'dark':'light'});
 await context.addInitScript(({large,dark})=>{
  if(dark)localStorage.setItem('travessia:reading:v1',JSON.stringify({theme:'dark'}));
  if(large){const observer=new MutationObserver(()=>{if(document.documentElement){document.documentElement.style.setProperty('font-size','200%','important');observer.disconnect();}});observer.observe(document,{childList:true,subtree:true});}
 },{large:!!profile.large,dark:!!profile.dark});
 const page=await context.newPage(),results:unknown[]=[];
 async function capture(name:string){
  if(profile.large)await page.addStyleTag({content:'html{font-size:200%!important}'});
  if(profile.dark)await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const result=await measure(page);results.push({name,...result});
  if(profile.large||['phone-modern','tablet','desktop','phone-landscape'].includes(profile.name)){
   await page.evaluate(()=>window.scrollTo(0,(document.querySelector('main')?.getBoundingClientRect().top??0)+scrollY));await page.screenshot({path:info.outputPath(`${name}.png`)});
  }
  if(!process.env.RESPONSIVE_BASELINE){
   expect.soft(result.rootWidth,`${name}: page horizontal overflow ${JSON.stringify(result.overflow)}`).toBeLessThanOrEqual(profile.width+2);
   if(name==='reading-panel'&&profile.width<=430)for(const panel of result.readingPanels)expect.soft(panel.width,'Reading popover leaves room for enlarged labels').toBeGreaterThanOrEqual(profile.width-64);
   for(const field of result.fields)expect.soft(field.width,`${name}: writing area ${field.label}`).toBeGreaterThanOrEqual(130);
  }
 }
 try{
  for(const route of ['/','/login','/cadastro','/previa/professor','/previa/professor/missoes','/previa/professor/entregas','/previa/professor/barreiras','/previa/professor/perfil','/previa/aluno','/previa/aluno/turmas','/previa/aluno/entregas','/previa/aluno/feedback','/previa/aluno/apoios','/previa/aluno/barreiras','/previa/aluno/ajuda']){
   await page.goto(route);await expect(page.locator('h1').first()).toBeVisible();
   if(route.startsWith('/previa'))await expect(page.getByText('Preparando cenário fictício…',{exact:true})).toHaveCount(0);
   await capture(route.replaceAll('/','-')||'landing');
  }
  await page.goto('/previa/professor/missoes/editor');await expect(page.getByLabel('Título da missão')).toBeVisible();
  await capture('editor-about');await page.getByRole('button',{name:'Continuar para as etapas →'}).click();await capture('editor-steps');
  await page.getByRole('button',{name:'Adicionar PDF de exemplo'}).click();
  await page.getByRole('button',{name:'Salvar e continuar →'}).click();await expect(page.getByLabel('Aluno destinatário')).toBeVisible();await capture('editor-materials');
  await page.getByRole('button',{name:'Revisar missão',exact:true}).click();await capture('editor-review');
  await page.goto('/previa/professor/missoes/campus/adaptacoes');await expect(page.getByLabel('Aluno destinatário')).toBeVisible();
  await page.getByText('Também ajustar a atividade',{exact:true}).click();await capture('materials-expanded');
  await page.goto('/previa/aluno/missoes/campus');await expect(page.getByLabel('Planejamento e atividade')).toBeVisible();
  await page.getByRole('region',{name:'Materiais preparados para você'}).getByText('rotas-do-campus.pdf · Texto ampliado e espaçado',{exact:true}).click();
  await page.getByText('Transcrição do áudio',{exact:true}).click();await capture('student-material-audio');
  await page.getByRole('button',{name:'Recolher menu',exact:true}).click();await capture('student-menu-collapsed');
  await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  await page.locator('#preferencias > summary').click();await capture('reading-panel');await page.keyboard.press('Escape');
  await productFixture(page,'teacher');await page.goto('/professor/missoes/test-mission/editar');
  await expect(page.getByLabel('Título da missão',{exact:true})).toBeVisible();await capture('real-editor-about');
  await page.getByRole('button',{name:'Continuar para as etapas →',exact:true}).click();await expect(page.getByRole('heading',{name:'Como o aluno vai realizar a atividade?',exact:true})).toBeVisible();await capture('real-editor-steps');
  await page.getByRole('button',{name:'Salvar e continuar →',exact:true}).click();await expect(page.getByRole('heading',{name:'Quer oferecer alguma ajuda?',exact:true})).toBeVisible();await capture('real-editor-supports');
  await page.getByRole('button',{name:'Salvar e revisar',exact:true}).click();await expect(page.getByRole('heading',{name:'Revisão antes de publicar'})).toBeVisible();await capture('real-editor-review');
  await productFixture(page,'student');await page.goto('/aluno/missoes/test-mission');await expect(page.getByRole('textbox',{name:'Planejamento e atividade',exact:true})).toBeVisible();await capture('real-student-mission');
  await profileFixture(page);await page.getByRole('button',{name:'Adicionar disciplina e curso',exact:true}).click();await capture('real-profile-expanded');
  await fixture(page);await addPdf(page);await capture('real-material-options');
  await page.getByRole('button',{name:'Preparar prévia →',exact:true}).click();await expect(page.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible();await capture('real-material-review');
 }finally{
  await mkdir(info.outputDir,{recursive:true});await writeFile(info.outputPath('measurements.json'),JSON.stringify({profile,results},null,2));await context.close();
 }
});
