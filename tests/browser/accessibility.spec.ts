import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const route of ['/aluno', '/professor', '/aluno/missoes/biblioteca']) {
  test(`verificações automáticas iniciais: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}
test('preferências por teclado e persistência sem diagnóstico', async ({ page }) => {
  await page.goto('/aluno');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByText('Aa · Ajustar leitura', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Mais contraste', { exact: true }).check();
  await page.getByLabel('Tamanho do texto').selectOption('1.25');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'true');
  await expect(page.locator('html')).toHaveAttribute('style', /font-size: 125%/);
  await page.getByText('Aa · Ajustar leitura', { exact: true }).click();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});
test('layout sem rolagem horizontal em 320px com texto ampliado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/aluno');
  await page.getByText('Aa · Ajustar leitura', { exact: true }).click();
  await page.getByLabel('Tamanho do texto').selectOption('1.25');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
