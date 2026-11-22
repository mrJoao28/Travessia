import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("monitoria mantém propostas e notas vinculadas à missão até a revisão", async ({ page }) => {
  await page.goto("/previa/professor/monitoria");
  await page.getByRole("button", { name: "Confirmar designação" }).click();
  await expect(page.getByRole("heading", { name: "Monitor designado" })).toBeFocused();
  await page.getByLabel("Alteração na missão").fill("Incluir um exemplo de percurso.");
  await page.getByRole("button", { name: "Enviar proposta para revisão" }).click();
  await page.getByLabel("Nota sugerida").fill("8");
  await page.getByRole("button", { name: "Enviar sugestão de nota" }).click();
  await page.getByRole("button", { name: "Alterar designação" }).click();
  await page.getByLabel("Missão", { exact: true }).selectOption("energia");
  await expect(page.getByText("Nota sugerida: 8 de 10")).toBeVisible();
  await page.getByRole("button", { name: "Aprovar proposta" }).click();
  await expect(page.getByRole("heading", { name: "Revisão do professor" })).toBeFocused();
  await page.getByRole("button", { name: "Confirmar revisão" }).click();
  await expect(page.getByText("Nenhuma sugestão pendente")).toBeVisible();
  const descriptions = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("travessia:interactive-preview:v1")!);
    return Object.fromEntries(state.missions.map((m: { id: string; description: string }) => [m.id, m.description]));
  });
  expect(descriptions.campus).toContain("Incluir um exemplo");
  expect(descriptions.energia).not.toContain("Incluir um exemplo");
});

test("moderação total exige confirmação por teclado e cabe a 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/previa/professor/monitoria");
  await page.getByRole("radio", { name: /Moderação parcial/ }).focus();
  await page.keyboard.press("ArrowDown");
  const submit = page.getByRole("button", { name: "Confirmar designação" });
  await expect(submit).toBeDisabled();
  await expect(page.getByLabel("Alteração na missão")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByLabel("Alteração na missão").fill("Rever instruções.");
  await page.getByRole("button", { name: "Aplicar alteração na missão" }).click();
  await expect(page.getByText("Alteração aplicada à missão fictícia.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
});
