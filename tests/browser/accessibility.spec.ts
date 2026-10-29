import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("espaçamento de texto, cores do sistema e movimento reduzido mantêm o conteúdo", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/previa/aluno/missoes/biblioteca");
  await expect(page.getByLabel("Planejamento da solução")).toBeVisible();
  await page.addStyleTag({
    content:
      "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByLabel("Planejamento da solução")
    .fill("Texto fictício com espaçamento ajustado.");
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Esta prévia não envia dados",
  );
});

const routes = [
  "/login",
  "/aluno",
  "/professor",
  "/previa/aluno",
  "/previa/aluno/turmas",
  "/previa/aluno/entregas",
  "/previa/aluno/barreiras",
  "/previa/aluno/missoes/biblioteca",
  "/previa/professor",
  "/previa/professor/entregas",
  "/previa/professor/barreiras",
  "/previa/professor/missoes/editor",
];
for (const route of routes) {
  test(`axe — ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
test("preferências por teclado, Escape, persistência local e skip link", async ({
  page,
}) => {
  await page.goto("/previa/aluno");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.getByText("Aa · Ajustar leitura", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Mais contraste", { exact: true }).check();
  await page.getByLabel("Tamanho do texto").selectOption("1.25");
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Aa · Ajustar leitura", { exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "true");
  await expect(page.locator("html")).toHaveAttribute(
    "style",
    /font-size: 125%/,
  );
  await page.getByRole("link", { name: "Ampliar texto" }).click();
  await expect(page.getByLabel("Tamanho do texto")).toBeVisible();
});
for (const route of routes)
  test(`reflow 320px e texto 200% — ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  });
test("prévia preserva atividade e não fabrica salvamento", async ({ page }) => {
  await page.goto("/previa/aluno/missoes/biblioteca");
  await page
    .getByLabel("Planejamento da solução")
    .fill("Planejamento fictício de teste.");
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Esta prévia não envia dados",
  );
  await expect(page.getByLabel("Planejamento da solução")).toHaveValue(
    "Planejamento fictício de teste.",
  );
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await expect(
    page.getByRole("heading", { name: "Desenvolver o protótipo" }),
  ).toBeFocused();
});
test("barreira informa destinatário antes do envio", async ({ page }) => {
  await page.goto("/previa/aluno/barreiras");
  await expect(page.locator("#recipients")).toContainText("somente você");
  await page
    .getByLabel("Compartilhar este relato com os docentes desta turma")
    .check();
  await expect(page.locator("#recipients")).toContainText(
    "docentes com vínculo ativo em Programação I",
  );
});
test("editor ordena etapas por teclado e exige revisão sem simular publicação", async ({
  page,
}) => {
  await page.goto("/previa/professor/missoes/editor");
  await page.getByRole("button", { name: "Mover etapa 1 para baixo" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Título da etapa").first()).toHaveValue(
    "Preparar uma alternativa",
  );
  await expect(page.getByLabel("Título da etapa").nth(1)).toBeFocused();
  await page.getByRole("button", { name: "Revisar missão" }).click();
  await expect(
    page.getByRole("heading", { name: "Revisão antes de publicar" }),
  ).toBeFocused();
  await page
    .getByLabel("Revisei o conteúdo, os critérios e os materiais.")
    .check();
  await page
    .getByRole("button", { name: "Publicar missão", exact: true })
    .click();
  await expect(page.getByRole("status").last()).toContainText(
    "Nenhuma missão foi publicada",
  );
});
test("erro real de login mantém campos e foco no resumo — transporte controlado no teste", async ({
  page,
}) => {
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"code":"API_UNAVAILABLE"}',
    }),
  );
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill("browser-test@example.invalid");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("fictitious-browser-test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("alert", { name: "Erro ao entrar" }),
  ).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "browser-test@example.invalid",
  );
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue(
    "fictitious-browser-test",
  );
});
test("área real sem API não usa dados de demonstração como fallback", async ({
  page,
}) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/aluno");
  await expect(
    page.getByRole("heading", { name: "Não foi possível abrir seu percurso" }),
  ).toBeVisible();
  await expect(page.getByText("Etapa 2 de 5 · Planejar a solução")).toHaveCount(
    0,
  );
});
