import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ApiResponse } from '../../apps/web/lib/api.generated';

async function setup(page: Page, failSave = false) {
  const profile: ApiResponse<'profile'> = { id: 'ui-profile-person', name: 'Pessoa fictícia', email: 'profile@example.invalid',
    emailVerified: true, phone: null, alternateEmail: null,
    student: { registration: null, institution: 'UEA', unit: null, course: 'Computação', period: null },
    teacher: { teachings: [{ subject: 'Cálculo I', course: 'Computação' }] } };
  let updates = 0;
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/me') return route.fulfill({ json: { id: profile.id, name: profile.name, email: profile.email, course: profile.student?.course, demo: true, preferences: {} } });
    if (path === '/api/v1/me/profile' && route.request().method() === 'GET') return route.fulfill({ json: profile });
    if (path === '/api/v1/me/profile' && route.request().method() === 'PATCH') {
      updates++;
      if (failSave) return route.fulfill({ status: 503, json: { code: 'UNAVAILABLE', message: 'Falha simulada.' } });
      return route.fulfill({ json: { ...profile, ...route.request().postDataJSON() } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/perfil');
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(profile.name);
  return () => updates;
}

test('perfil mantém alterações quando o servidor falha e permite tentar novamente', async ({ page }) => {
  const updates = await setup(page, true);
  await page.getByLabel('Matrícula', { exact: true }).fill('2026999');
  await page.getByRole('button', { name: 'Salvar perfil de aluno', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Seu texto foi preservado');
  await expect(page.getByLabel('Matrícula', { exact: true })).toHaveValue('2026999');
  expect(updates()).toBe(1);
  await expect(page.getByRole('button', { name: 'Salvar perfil de aluno', exact: true })).toBeEnabled();
});

test('disciplinas repetidas são corrigíveis por teclado e a tela permite reflow', async ({ page }) => {
  const updates = await setup(page);
  await page.getByRole('button', { name: 'Adicionar disciplina e curso', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Disciplina 2', { exact: true })).toBeFocused();
  await page.keyboard.type(' cálculo i ');
  await page.keyboard.press('Tab');
  await page.keyboard.type(' computação ');
  await page.getByRole('button', { name: 'Salvar perfil de professor', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('sem repetir a mesma associação');
  await expect(page.getByLabel('Disciplina 2', { exact: true })).toBeFocused();
  expect(updates()).toBe(0);
  await page.getByLabel('Curso 2', { exact: true }).fill('Engenharia Elétrica');
  await page.getByRole('button', { name: 'Salvar perfil de professor', exact: true }).click();
  await expect(page.getByText('Perfil de professor salvo.', { exact: true })).toBeVisible();
  expect(updates()).toBe(1);
  await expect(page.getByLabel('Turno', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Coordenação', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});
