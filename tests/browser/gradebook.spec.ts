import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixture, version } from "../fixtures/product-ui";

test.describe("Área de Avaliações e Notas do Professor", () => {
  test("gerencia avaliações com card compacto, exemplos AP1/AP2, associação de atividades e reflow acessível", async ({
    page,
  }) => {
    await fixture(page, "teacher");
    await page.goto("/professor?turma=test-classroom");

    // 1. Localizar e abrir disclosure de avaliações
    const disclosure = page.locator("details.gradebook-disclosure");
    await expect(disclosure).toBeVisible();
    const summary = disclosure.locator("summary");
    await expect(summary).toHaveAccessibleName("Avaliações e notas");
    await expect(page.locator(`#${await summary.getAttribute("aria-describedby")}`)).toHaveText("Organize períodos e consulte resultados");

    // Abrir via teclado
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(disclosure).toHaveAttribute("open", "");

    // 2. Verificar texto explicativo e regras pedagógicas (IA não avalia, exemplos de avaliações)
    const intro = disclosure.locator(".gradebook-intro");
    await expect(intro).toContainText("Avaliação 1");
    await expect(intro).toContainText("Prova 1");
    await expect(intro).toContainText("AP1");
    await expect(intro).toContainText("AP2");
    await expect(intro).toContainText("nenhuma nota é calculada pela IA");

    // 3. Testar sugestões rápidas no card compacto de criação
    const creationCard = disclosure.locator(".grade-creation-card");
    await expect(creationCard).toBeVisible();

    const nameInput = creationCard.getByLabel("Nome da avaliação ou prova");
    await expect(nameInput).toHaveAttribute("placeholder", "Ex.: Avaliação 1, Prova 1, AP1, AP2");

    // Clicar no chip de sugestão "AP1"
    const ap1Chip = creationCard.getByRole("button", { name: "AP1", exact: true });
    await expect(ap1Chip).toBeVisible();
    await ap1Chip.click();
    await expect(nameInput).toHaveValue("AP1");

    // Criar avaliação AP1
    const createBtn = creationCard.getByRole("button", { name: "Criar avaliação", exact: true });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Feedback de status anunciado
    const statusMsg = disclosure.locator(".gradebook-status");
    await expect(statusMsg).toBeVisible();
    await expect(statusMsg).toContainText('Avaliação "AP1" criada com sucesso');
    await expect(statusMsg).toHaveAttribute("role", "status");

    // 4. Verificar cartão de avaliação criado
    const periodCard = disclosure.locator(".grade-period-card").filter({ hasText: "AP1" });
    await expect(periodCard).toBeVisible();
    await expect(periodCard.locator(".grade-card-title")).toHaveText("AP1");
    await expect(periodCard.locator(".grade-badge.formula")).toHaveText("Média ponderada");
    await expect(periodCard.locator(".grade-badge.count")).toHaveText("0 atividades");

    // 5. Associar atividade à avaliação com peso configurado
    const selectActivity = periodCard.locator("select.grade-select");
    await expect(selectActivity).toBeVisible();
    await selectActivity.selectOption({ label: version.title });

    const weightInput = periodCard.locator("input.grade-weight-input");
    await weightInput.fill("2");

    const addActivityBtn = periodCard.getByRole("button", { name: "Adicionar", exact: true });
    await expect(addActivityBtn).toBeEnabled();
    await addActivityBtn.click();

    // Feedback de adição e composição atualizada
    await expect(statusMsg).toContainText('associada à avaliação "AP1" com peso 2');
    await expect(periodCard.locator(".grade-badge.count")).toHaveText("1 atividade");
    const compositionChip = periodCard.locator(".grade-composition-chip");
    await expect(compositionChip).toContainText(version.title);
    await expect(compositionChip).toContainText("Peso 2");

    // 6. Visualizar notas da turma (gradebook)
    const viewGradesBtn = periodCard.getByRole("button", { name: "Visualizar notas", exact: true });
    await expect(viewGradesBtn).toBeVisible();
    await viewGradesBtn.click();

    const activePanel = disclosure.locator(".gradebook-active-panel");
    await expect(activePanel).toBeVisible();
    await expect(activePanel.locator(".gradebook-active-title")).toHaveText("Quadro de notas — AP1");

    // Conferir tabela e valores
    const tableScroll = activePanel.locator(".table-scroll");
    await expect(tableScroll).toBeVisible();
    await expect(tableScroll).toHaveAttribute("tabindex", "0");
    await expect(tableScroll.locator("table caption")).toContainText("Notas e médias dos estudantes — AP1");
    await expect(tableScroll.locator("tbody tr")).toHaveCount(1);
    await expect(tableScroll.locator("tbody th")).toHaveText("Estudante Demonstração");
    await expect(tableScroll.locator("tbody td.grade-cell-average")).toHaveText("9,00");

    // 7. Acessibilidade com Axe
    const axeResults = await new AxeBuilder({ page })
      .include("details.gradebook-disclosure")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axeResults.violations).toEqual([]);

    // 8. Reflow em viewport estreito de 320px
    await page.setViewportSize({ width: 320, height: 800 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);

    // 9. Reflow com texto ampliado a 200%
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const hasOverflowZoom = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasOverflowZoom).toBe(false);

    // Fechar visualização de notas
    const closeNotesBtn = activePanel.getByRole("button", { name: "Fechar notas" });
    await closeNotesBtn.click();
    await expect(activePanel).toHaveCount(0);
  });
});
