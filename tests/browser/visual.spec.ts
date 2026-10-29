import { test, expect } from "@playwright/test";
test("capturas da composição aprovada — desktop e mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1586, height: 991 });
  await page.goto("/previa/aluno");
  await expect(
    page.getByRole("heading", { name: "Um passo de cada vez." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "style",
    /font-size: 100%/,
  );
  await page.screenshot({
    path: "test-results/reference-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.screenshot({
    path: "test-results/reference-mobile.png",
    fullPage: true,
  });
});
