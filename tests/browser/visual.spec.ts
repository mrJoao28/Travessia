import { test, expect } from "@playwright/test";
test("identidade Mais Acesso — aluno, professor, login e mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1586, height: 991 });
  await page.goto("/previa/aluno");
  await expect(
    page.getByRole("heading", { name: "Um passo de cada vez." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "style",
    /font-size: 100%/,
  );
  await expect(page.locator(".path-art img")).toBeVisible();
  await expect.poll(() => page.locator(".path-art img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({
    path: "test-results/reference-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.screenshot({
    path: "test-results/reference-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1586, height: 991 });
  await page.goto("/previa/professor");
  await expect(page.locator(".path-art img")).toBeVisible();
  await expect.poll(() => page.locator(".path-art img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/reference-teacher.png", fullPage: true });
  await page.goto("/login");
  await expect(page.locator(".login-art")).toBeVisible();
  await expect.poll(() => page.locator(".login-art").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/reference-login.png", fullPage: true });
});
