import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Controlled transport exercises form recovery and accessibility; real account flows
// are separately covered in browser-real/registration.spec.ts with PostgreSQL.
async function fillAccount(page: import('@playwright/test').Page) {
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa fictícia');
  await page.getByLabel('E-mail', { exact: true }).fill('cadastro-ui@example.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('senha-ficticia-longa-123');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('senha-ficticia-longa-123');
}

test('cadastro mantém campos ao escolher espaço, opera por teclado e tem reflow', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Criar uma conta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Crie sua conta', exact: true })).toBeVisible();
  await fillAccount(page);
  await page.getByRole('radio', { name: 'Sou aluno', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Sou professor', exact: true })).toBeChecked();
  await expect(page.getByLabel('Nome completo')).toHaveValue('Pessoa fictícia');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('senha-ficticia-longa-123');
  await page.getByRole('button', { name: 'Mostrar senhas', exact: true }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar senhas', exact: true }).click();
  await page.screenshot({ path: 'test-results/reference-register-teacher-desktop.png', fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.getByRole('radio', { name: 'Sou aluno', exact: true }).check();
  await page.screenshot({ path: 'test-results/reference-register-student-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 850 });
  await page.screenshot({ path: 'test-results/reference-register-mobile.png', fullPage: true });
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Criar minha conta', exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/reference-register-mobile-200.png', fullPage: true });
});

test('senhas diferentes não chamam API; falha 429 preserva dados e foco', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/auth/sign-up/email', route => { calls++; return route.fulfill({ status: 429, json: { code: 'RATE_LIMITED' } }); });
  await page.goto('/cadastro'); await fillAccount(page);
  await page.getByLabel('Confirmar senha', { exact: true }).fill('outra-senha-longa-123');
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Erro ao criar conta', exact: true })).toBeFocused();
  await expect(page.getByLabel('Confirmar senha', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Conferir confirmação da senha', exact: true }).click();
  await expect(page.getByLabel('Confirmar senha', { exact: true })).toBeFocused();
  await page.getByLabel('Confirmar senha', { exact: true }).fill('senha-ficticia-longa-123');
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Erro ao criar conta', exact: true })).toContainText('Muitas tentativas');
  await expect(page.getByLabel('E-mail')).toHaveValue('cadastro-ui@example.invalid');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('senha-ficticia-longa-123');
  expect(calls).toBe(1);
});

test('conta confirmada não é cadastrada novamente se falhar a sessão', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/auth/sign-up/email', route => { calls++; return route.fulfill({ status: 200, json: { user: { id: 'test-account' } } }); });
  await page.route('**/api/auth/get-session', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/cadastro'); await fillAccount(page);
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Erro ao criar conta', exact: true })).toContainText('Sua conta foi criada');
  await expect(page.getByRole('button', { name: 'Conta criada', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Entrar na minha conta', exact: true })).toHaveAttribute('href', '/login');
  expect(calls).toBe(1);
});

test('cadastro sem JavaScript não envia credenciais por formulário nativo', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage(); await page.goto('/cadastro');
    await expect(page.locator('form')).toHaveAttribute('method', 'post');
    for (const label of ['Nome completo', 'E-mail', 'Senha', 'Confirmar senha']) await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Criar minha conta', exact: true })).toBeDisabled();
    await expect(page.getByText('Ative o JavaScript para criar sua conta com segurança.', { exact: true })).toBeVisible();
    expect(new URL(page.url()).search).toBe('');
  } finally { await context.close(); }
});

test('primeiros passos preservam convite recusado e continuam legíveis com texto ampliado', async ({ page }) => {
  await page.route('**/api/v1/me', route => route.fulfill({ json: { id: 'test-user', name: 'Pessoa fictícia', email: 'welcome@example.invalid', course: null, demo: true, preferences: {} } }));
  await page.route('**/api/v1/invitations/accept', route => route.fulfill({ status: 400, json: { code: 'INVALID_INVITATION' } }));
  await page.goto('/boas-vindas?espaco=aluno');
  const token = 'a'.repeat(64);
  await page.getByLabel('Código de convite', { exact: true }).fill(token);
  await page.getByRole('button', { name: 'Entrar na turma', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeFocused();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Peça um novo código ao professor');
  await expect(page.getByLabel('Código de convite', { exact: true })).toHaveValue(token);
  await page.getByRole('radio', { name: 'Sou professor', exact: true }).check();
  await expect(page.getByLabel('Nome da turma', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 850 });
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/reference-welcome-mobile-200.png', fullPage: true });
});
