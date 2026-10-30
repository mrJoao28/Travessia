import { test, expect } from '@playwright/test';

test('login antes da hidratação não permite envio nativo de credenciais pela URL', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/login');
    await expect(page.locator('form')).toHaveAttribute('method', 'post');
    await expect(page.getByLabel('Email', { exact: true })).toBeDisabled();
    await expect(page.getByLabel('Senha', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeDisabled();
    await expect(page.getByText('Ative o JavaScript para entrar com segurança.', { exact: true })).toBeVisible();
    expect(new URL(page.url()).search).toBe('');
  } finally { await context.close(); }
});
