import { randomBytes } from 'node:crypto';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('cadastro real: professor cria turma, aluno aceita convite e permissões continuam isoladas', async ({ browser, baseURL }) => {
  if (!process.env.TRAVESSIA_WEB_TEST_URL) throw new Error('Execute pelo runner de integração isolada.');
  const teacherContext = await browser.newContext({ baseURL });
  const studentContext = await browser.newContext({ baseURL });
  const teacher = await teacherContext.newPage();
  const student = await studentContext.newPage();
  const teacherEmail = `prof-${randomBytes(6).toString('hex')}@example.invalid`;
  const studentEmail = `aluno-${randomBytes(6).toString('hex')}@example.invalid`;
  const password = randomBytes(4).toString('hex');
  async function register(page: typeof teacher, space: 'aluno' | 'professor', email: string, invited=false) {
    if(!invited){await page.goto('/cadastro');await page.getByRole('radio', { name: `Sou ${space}`, exact: true }).check();}
    await page.getByLabel('Nome completo', { exact: true }).fill(space === 'professor' ? 'Professor Fictício' : 'Aluno Fictício');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByLabel('Confirmar senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/boas-vindas\\?espaco=${space}${invited?'(?:#convite=[A-Z2-9]{8})':''}$`));
    await expect(page.getByRole('heading', { name: 'Vamos começar?', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: space === 'professor' ? 'Crie sua primeira turma' : 'Entre na sua turma', exact: true })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
  }
  try {
    await register(teacher, 'professor', teacherEmail);
    await expect(teacher.getByRole('heading', { name: 'Crie sua primeira turma', exact: true })).toBeVisible();
    expect((await teacher.request.get('/api/v1/classrooms').then(r => r.json())).items).toHaveLength(0);
    await teacher.getByLabel('Nome da turma', { exact: true }).fill('Turma de cadastro inclusivo');
    await teacher.getByRole('button', { name: 'Criar minha turma', exact: true }).click();
    await expect(teacher).toHaveURL(/\/professor\?turma=/);
    await expect(teacher.getByRole('heading', { name: 'Turma de cadastro inclusivo', exact: true })).toBeVisible();
    const rooms = await teacher.request.get('/api/v1/classrooms').then(r => r.json());
    const classroomId = rooms.items[0].id;
    expect(rooms.items[0].role).toBe('teacher');
    await expect(teacher.getByRole('heading',{name:'Primeiros passos da sua turma',exact:true})).toBeVisible();
    await teacher.getByRole('button',{name:'Convidar alunos',exact:true}).click();
    await teacher.getByRole('button', { name: 'Gerar convite de aluno', exact: true }).click();
    const invite = teacher.getByLabel('Código de convite', { exact: true });
    await expect(invite).toHaveValue(/^[A-HJ-NP-Z2-9]{8}$/);
    const token = await invite.inputValue();
    const link=await teacher.getByLabel('Link de convite',{exact:true}).inputValue();
    await teacher.getByLabel('E-mail do aluno',{exact:true}).fill(studentEmail);
    const mail=new URL((await teacher.getByRole('link',{name:'Convidar por e-mail',exact:true}).getAttribute('href'))!);
    expect(mail.searchParams.get('body')).toContain(link);expect(mail.searchParams.get('body')).toContain(token);
    await student.goto(link);
    await expect(student.getByRole('heading',{name:'Você recebeu um convite de turma',exact:true})).toBeVisible();
    await student.getByRole('link',{name:'Criar conta de aluno',exact:true}).click();
    await register(student, 'aluno', studentEmail,true);
    await expect(student.getByLabel('Código de convite',{exact:true})).toHaveValue(token);
    expect((await student.request.get('/api/v1/classrooms').then(r => r.json())).items).toHaveLength(0);
    const forbidden = await student.request.post(`/api/v1/classrooms/${classroomId}/invitations`, { headers: { Origin: baseURL! }, data: {} });
    expect(forbidden.status()).toBe(404);
    await student.getByLabel('Código de convite', { exact: true }).fill(link);
    await student.getByRole('button', { name: 'Entrar na turma', exact: true }).click();
    await expect(student).toHaveURL(/\/aluno\?turma=/);
    expect((await student.request.get('/api/v1/classrooms').then(r => r.json())).items[0].role).toBe('student');
    await expect(student.getByRole('heading',{name:'Você entrou na turma Turma de cadastro inclusivo.',exact:true})).toBeVisible();
    const input={title:'Primeira missão do laboratório',description:'Compare duas soluções para organizar o laboratório.',objectives:['Comparar duas alternativas.'],criteria:['Justificar uma escolha com dois dados.'],steps:[{title:'Conhecer o desafio',instructions:'Leia os dados e compare as alternativas.',example:'Compare custo e clareza.'}],materials:[]};
    const createdResponse=await teacher.request.post(`/api/v1/classrooms/${classroomId}/missions`,{headers:{Origin:baseURL!},data:input});expect(createdResponse.status()).toBe(200);const created=await createdResponse.json();
    expect((await teacher.request.post(`/api/v1/missions/${created.id}/publish`,{headers:{Origin:baseURL!},data:{versionId:created.draftVersion.id,reviewed:true}})).status()).toBe(200);
    await student.reload();await expect(student.getByRole('link',{name:'Começar minha primeira missão',exact:true})).toBeVisible();
    await student.getByRole('link',{name:'Começar minha primeira missão',exact:true}).click();await expect(student.getByRole('heading',{level:1})).toHaveText(input.title);

    const stillForbidden = await student.request.post(`/api/v1/classrooms/${classroomId}/invitations`, { headers: { Origin: baseURL! }, data: {} });
    expect(stillForbidden.status()).toBe(404);
    // Logging in again selects the context from actual memberships, not a client role.
    await teacher.locator('summary[aria-label="Menu da conta"]').click();
    await teacher.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await expect(teacher).toHaveURL(/\/login$/);
    await teacher.getByLabel('Email', { exact: true }).fill(teacherEmail);
    await teacher.getByLabel('Senha', { exact: true }).fill(password);
    await teacher.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(teacher).toHaveURL(/\/professor$/);
    await expect(teacher.getByRole('heading', { name: 'Turma de cadastro inclusivo', exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page: teacher }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    // A fresh professor is also free to use the student area without losing access.
    await teacher.locator('summary[aria-label="Menu da conta"]').click();
    await teacher.getByRole('link', { name: 'Ir para o espaço do aluno', exact: true }).click();
    await expect(teacher.getByRole('link', { name: 'Entrar na minha turma', exact: true })).toBeVisible();
  } finally { await teacherContext.close(); await studentContext.close(); }
});
