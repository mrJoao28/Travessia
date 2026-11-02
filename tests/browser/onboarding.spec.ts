import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const code='ABCD2345';
const profile={id:'onboarding-user',name:'Pessoa fictícia',email:'onboarding@example.invalid',course:null,demo:false,preferences:{}};
async function classroomFixture(page:Page,role:'teacher'|'student'){
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname.replace('/api/v1',''),method=route.request().method();
  const json=(value:unknown)=>route.fulfill({json:value});
  if(path==='/me')return json(profile);
  if(path==='/classrooms')return json({items:[{id:'first-class',name:'Laboratório de projetos',role}],nextCursor:null});
  if(path==='/classrooms/first-class/missions')return json({items:[],nextCursor:null});
  if(path==='/classrooms/first-class/members')return json({items:[{id:'teacher-member',name:'Docente fictício',role:'teacher',active:true}],nextCursor:null});
  if(path==='/classrooms/first-class/invitations'&&method==='GET')return json({items:[],nextCursor:null});
  if(path==='/classrooms/first-class/invitations'&&method==='POST'){expect(route.request().postDataJSON()).toEqual({reusable:true});return json({id:'first-invite',token:'a'.repeat(64),code,reusable:true,createdAt:'2026-11-01T12:00:00.000Z',expiresAt:'2026-11-08T12:00:00.000Z'});}
  return route.fulfill({status:404,json:{code:'NOT_FOUND'}});
 });
}
test('primeira turma mostra três passos, convite curto, link e mensagem por e-mail',async({page})=>{
 await classroomFixture(page,'teacher');await page.setViewportSize({width:1440,height:1000});await page.goto('/professor?turma=first-class');
 await expect(page.getByRole('heading',{name:'Primeiros passos da sua turma',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Criar primeira missão',exact:true})).toHaveAttribute('href','/professor/missoes/nova?turma=first-class');
 await page.getByRole('button',{name:'Convidar alunos',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.getByText('Alunos da turma e convites',{exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Gerar convite de aluno',exact:true}).click();
 await expect(page.getByLabel('Código de convite',{exact:true})).toHaveValue(code);await expect(page.getByLabel('Código de convite',{exact:true})).toBeFocused();
 const link=await page.getByLabel('Link de convite',{exact:true}).inputValue();expect(link).toMatch(/\/boas-vindas\?espaco=aluno#convite=ABCD2345$/);
 await page.getByLabel('E-mail do aluno',{exact:true}).fill('aluno-ficticio@example.invalid');
 const mail=new URL((await page.getByRole('link',{name:'Convidar por e-mail',exact:true}).getAttribute('href'))!);expect(decodeURIComponent(mail.pathname)).toBe('aluno-ficticio@example.invalid');expect(mail.searchParams.get('body')).toContain(link);expect(mail.searchParams.get('body')).toContain(code);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 await page.screenshot({path:'test-results/reference-first-steps-teacher-desktop.png',fullPage:true});
 await page.setViewportSize({width:320,height:850});await page.addStyleTag({content:'html {font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:'test-results/reference-first-steps-teacher-mobile.png',fullPage:true});
});
test('aluno que entrou em uma turma vazia recebe orientação clara',async({page})=>{
 await classroomFixture(page,'student');await page.goto('/aluno?turma=first-class');
 await expect(page.getByRole('heading',{name:'Você entrou na turma Laboratório de projetos.',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Consultar minhas turmas',exact:true})).toHaveAttribute('href','/aluno/turmas');
 await expect(page.getByText('Retome sua missão de onde parou.',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Começar minha primeira missão',exact:true})).toHaveCount(0);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 await page.screenshot({path:'test-results/reference-first-steps-student-empty.png',fullPage:true});
});
test('convite antes do login mantém o código sem aceitar automaticamente a turma',async({page})=>{
 let logged=false,accepts=0;
 await page.route('**/api/v1/me',route=>logged?route.fulfill({json:profile}):route.fulfill({status:401,json:{code:'UNAUTHENTICATED'}}));
 await page.route('**/api/auth/sign-in/email',route=>{logged=true;return route.fulfill({json:{user:{id:profile.id}}});});
 await page.route('**/api/auth/get-session',route=>route.fulfill({json:{session:{id:'session-test'},user:{id:profile.id}}}));
 await page.route('**/api/v1/invitations/accept',route=>{accepts++;expect(route.request().postDataJSON()).toEqual({token:code});return route.fulfill({status:400,json:{code:'INVALID_INVITATION'}});});
 await page.goto('/boas-vindas?espaco=aluno#convite='+code);
 await expect(page.getByRole('heading',{name:'Você recebeu um convite de turma',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Criar conta de aluno',exact:true})).toHaveAttribute('href','/cadastro#convite='+code);
 await page.getByRole('link',{name:'Entrar na minha conta',exact:true}).click();
 await page.getByLabel('Email',{exact:true}).fill(profile.email);await page.getByLabel('Senha',{exact:true}).fill('Fictional123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.getByLabel('Código de convite',{exact:true})).toHaveValue(code);expect(accepts).toBe(0);
 await page.getByLabel('Código de convite',{exact:true}).fill('abcd-2345');await page.getByRole('button',{name:'Entrar na turma',exact:true}).click();
 await expect(page.getByRole('main').getByRole('alert')).toContainText('Peça um novo código ao professor');expect(accepts).toBe(1);
 await expect(page.getByLabel('Código de convite',{exact:true})).toHaveValue('abcd-2345');
 await page.evaluate(()=>{window.location.hash='convite=EFGH6789';});
 await expect(page.getByLabel('Código de convite',{exact:true})).toHaveValue('EFGH6789');
 await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
 await page.evaluate(()=>{window.location.hash='convite=invalid';});
 await expect(page.getByLabel('Código de convite',{exact:true})).toHaveValue('');
});
test('fragmento conserva convite mesmo com sessionStorage bloqueado',async({page})=>{
 await page.addInitScript(()=>{const blocked={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');},removeItem:()=>{throw new Error('blocked');}};Object.defineProperty(window,'sessionStorage',{value:blocked});});
 await page.route('**/api/v1/me',route=>route.fulfill({status:401,json:{code:'UNAUTHENTICATED'}}));
 await page.goto('/boas-vindas?espaco=aluno#convite='+code);await page.getByRole('link',{name:'Entrar na minha conta',exact:true}).click();
 await expect(page.getByRole('link',{name:'Criar uma conta',exact:true})).toHaveAttribute('href','/cadastro#convite='+code);await page.getByRole('link',{name:'Criar uma conta',exact:true}).click();
 await expect(page.getByRole('radio')).toHaveCount(0);await expect(page.getByText('Você recebeu um convite de aluno. Depois do cadastro, confirme sua entrada na turma.',{exact:true})).toBeVisible();
});
