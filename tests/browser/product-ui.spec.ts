import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { ApiBody, ApiResponse } from "../../apps/web/lib/api.generated";

import {fixture,me,version,submission} from "../fixtures/product-ui";

test("docente pode criar novas turmas nas áreas de turmas e atividades", async ({ page }) => {
  await fixture(page, "teacher");
  for (const destination of ["/professor", "/professor/atividades"]) {
    await page.goto(destination);
    const trigger = page.getByRole("button", { name: "Criar turma", exact: true });
    await expect(trigger).toBeVisible();
    await trigger.focus();
    await page.keyboard.press("Enter");
    const name = page.getByLabel("Nome da turma", { exact: true });
    await expect(name).toBeFocused();
    expect((await new AxeBuilder({ page }).include(".page-heading").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await name.fill(`Turma criada em ${destination}`);
    const request = page.waitForRequest((candidate) =>
      candidate.url().endsWith("/api/v1/classrooms") && candidate.method() === "POST",
    );
    await page.getByRole("button", { name: "Salvar turma", exact: true }).click();
    expect((await request).postDataJSON()).toEqual({ name: `Turma criada em ${destination}`, shift: null });
    await expect(trigger).toBeFocused();
    await expect(name).toHaveCount(0);
    await expect(trigger).toBeVisible();
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("seletor de turmas agrupa nome e papel e mantém a ação alinhada em telas estreitas", async ({ page }) => {
  await fixture(page, "teacher", { multipleClassrooms: true });
  await page.goto("/professor");

  const panel = page.locator(".classroom-choice-panel");
  await expect(panel.getByRole("heading", { name: "Escolha uma turma para começar" })).toBeVisible();
  const cards = panel.locator(".classroom-choice-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).locator(".classroom-role-badge")).toHaveText("Monitor");
  await expect(cards.nth(1).locator(".classroom-role-badge")).toHaveText("Professor");

  const firstCard = cards.nth(0);
  const open = firstCard.getByRole("link", { name: "Abrir turma Legislação" });
  await expect(open).toHaveAttribute("href", "/professor?turma=monitor-classroom");
  await open.focus();
  await expect(open).toBeFocused();

  const desktopLayout = await firstCard.evaluate((card) => {
    const copy = card.querySelector(".classroom-choice-copy")?.getBoundingClientRect();
    const actions = card.querySelector(".classroom-choice-actions")?.getBoundingClientRect();
    return copy && actions ? { copyRight: copy.right, actionsLeft: actions.left } : null;
  });
  expect(desktopLayout).not.toBeNull();
  expect(desktopLayout!.actionsLeft).toBeGreaterThan(desktopLayout!.copyRight);

  await firstCard.locator("h3").evaluate((heading) => {
    heading.textContent = "Legislação e políticas públicas com um título longo para conferir o alinhamento dos controles";
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.setViewportSize({ width: 760, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const intermediateLayout = await firstCard.evaluate((card) => {
    const copy = card.querySelector(".classroom-choice-copy")?.getBoundingClientRect();
    const actions = card.querySelector(".classroom-choice-actions")?.getBoundingClientRect();
    return copy && actions ? { copyRight: copy.right, actionsLeft: actions.left } : null;
  });
  expect(intermediateLayout).not.toBeNull();
  expect(intermediateLayout!.actionsLeft).toBeGreaterThan(intermediateLayout!.copyRight);

  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  const mobileLayout = await firstCard.evaluate((card) => {
    const copy = card.querySelector(".classroom-choice-copy")?.getBoundingClientRect();
    const actions = card.querySelector(".classroom-choice-actions")?.getBoundingClientRect();
    const button = card.querySelector(".classroom-choice-actions .button")?.getBoundingClientRect();
    return copy && actions && button
      ? { copyBottom: copy.bottom, actionsTop: actions.top, actionsWidth: actions.width, buttonWidth: button.width }
      : null;
  });
  expect(mobileLayout).not.toBeNull();
  expect(mobileLayout!.actionsTop).toBeGreaterThanOrEqual(mobileLayout!.copyBottom);
  expect(mobileLayout!.buttonWidth).toBeGreaterThan(mobileLayout!.actionsWidth * 0.9);

  expect(
    (await new AxeBuilder({ page }).include(".classroom-choice-panel").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations,
  ).toEqual([]);
});

test("monitor tem ferramentas docentes na turma e é identificado como monitor", async ({ page }) => {
  await fixture(page, "monitor");
  await page.goto("/professor");
  await expect(page.getByRole("heading", { name: "Painel de monitoria", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Oficina de Projetos Inclusivos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: version.title, exact: true })).toBeVisible();
  await expect(page.getByText("Você atua como monitor nesta turma.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar atividade", exact: true })).toBeVisible();
  const deliveries = page.getByRole("link", { name: /Acompanhar entregas/ });
  await expect(deliveries).toHaveAttribute("href", "/professor/entregas?turma=test-classroom");
  await deliveries.focus();
  await expect(deliveries).toBeFocused();
  await expect(page.getByRole("link", { name: /Apoios e barreiras/ })).toHaveAttribute("href", "/professor/barreiras?turma=test-classroom");
  await expect(page.getByRole("link", { name: "Criar atividade", exact: true })).toHaveAttribute("href", "/professor/atividades/nova?turma=test-classroom");
  await expect(page.getByRole("link", { name: "Gerenciar turmas e convites", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Configurar materiais e apoios", exact: true })).toBeVisible();
  await page.getByText("Alunos da turma e convites", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Participantes de Oficina de Projetos Inclusivos" })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include("section[aria-labelledby=monitoria-title]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);

  await page.goto("/professor/turmas");
  await expect(page.getByRole("heading", { name: "Oficina de Projetos Inclusivos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir turma", exact: true })).toHaveCount(0);
  await expect(page.getByText("Monitor · vínculo ativo", { exact: true })).toBeVisible();
  await expect(page.getByText("Monitor · vínculo ativo", { exact: true })).toBeVisible();
});

test("cartões de gestão de turma agrupam ações e refluem com texto ampliado", async ({ page }) => {
  await fixture(page, "teacher");
  await page.goto("/professor/turmas");
  const actions = page.getByRole("group", { name: "Ações para a turma Oficina de Projetos Inclusivos" });
  const open = actions.getByRole("button", { name: "Abrir turma" });
  await expect(open).toBeVisible();
  await open.focus();
  await expect(open).toBeFocused();
  const desktopLayout = await page.evaluate(() => {
    const copy = document.querySelector(".classroom-card-copy")?.getBoundingClientRect();
    const action = document.querySelector(".classroom-card-actions")?.getBoundingClientRect();
    return copy && action ? { copyRight: copy.right, actionLeft: action.left } : null;
  });
  expect(desktopLayout).not.toBeNull();
  expect(desktopLayout!.actionLeft).toBeGreaterThan(desktopLayout!.copyRight);
  await page.evaluate(() => {
    const title = document.querySelector(".classroom-card-copy h2");
    if (title) title.textContent = "Turma com um título extenso para conferir a quebra de linha sem deslocar os controles de gestão";
    document.documentElement.style.fontSize = "200%";
  });
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const mobileLayout = await page.evaluate(() => {
    const copy = document.querySelector(".classroom-card-copy")?.getBoundingClientRect();
    const actionElement = document.querySelector(".classroom-card-actions");
    const action = actionElement?.getBoundingClientRect();
    const button = document.querySelector(".classroom-card-actions .button")?.getBoundingClientRect();
    if (!copy || !action || !button || !actionElement) return null;
    const style = getComputedStyle(actionElement);
    const actionContentWidth = action.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    return { copyBottom: copy.bottom, actionTop: action.top, actionContentWidth, buttonWidth: button.width };
  });
  expect(mobileLayout).not.toBeNull();
  expect(mobileLayout!.actionTop).toBeGreaterThanOrEqual(mobileLayout!.copyBottom);
  expect(mobileLayout!.buttonWidth).toBeGreaterThan(mobileLayout!.actionContentWidth * 0.9);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
});

test("proprietário arquiva turma e consulta o histórico preservado", async ({ page }) => {
  await fixture(page, "teacher");
  await page.goto("/professor/turmas");
  await expect(page.getByRole("heading", { name: "Oficina de Projetos Inclusivos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir turma", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir turma", exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  const request = page.waitForRequest(candidate => candidate.url().endsWith("/api/v1/classrooms/test-classroom") && candidate.method() === "DELETE");
  await page.getByRole("button", { name: "Excluir turma", exact: true }).click();
  await request;
  await expect(page.getByText("Turma excluída da lista ativa e arquivada. O histórico foi preservado.")).toBeVisible();
  await page.getByLabel("Exibir turmas").selectOption("archived");
  await expect(page.getByRole("heading", { name: "Oficina de Projetos Inclusivos", exact: true })).toBeVisible();
  await expect(page.getByText("Consultar atividades e entregas", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
});

test("docente exclui atividade sem histórico e mantém acesso às entregas", async ({ page }) => {
  await fixture(page, "teacher");
  await page.goto("/professor?turma=test-classroom");
  const deliveries = page.getByRole("link", { name: "Ver entregas da atividade", exact: true });
  await expect(deliveries).toHaveAttribute("href", "/professor/entregas?atividade=test-mission&turma=test-classroom");
  await expect(page.getByRole("button", { name: "Excluir atividade", exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  const request = page.waitForRequest(candidate => candidate.url().endsWith("/api/v1/activities/test-mission") && candidate.method() === "DELETE");
  await page.getByRole("button", { name: "Excluir atividade", exact: true }).click();
  await request;
  await expect(page.getByText("Atividade excluída.", { exact: true })).toBeVisible();
});

test("rascunho aguarda confirmação, bloqueia edição concorrente e preserva texto no conflito", async ({
  page,
}) => {
  await fixture(page, "student");
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/v1/activities/test-mission/submissions",
    async (route) => {
      if (route.request().method() === "GET") return route.fallback();
      const body = route.request().postDataJSON() as ApiBody<"saveSubmission">;
      expect(body.expectedRevision).toBe(3);
      expect(body.currentStepId).toBe("step-two");
      expect(body).not.toHaveProperty("userId");
      await held;
      await route.fulfill({
        status: 409,
        json: { code: "REVISION_CONFLICT", message: "Versão alterada." },
      });
    },
  );
  await page.goto("/aluno/atividades/test-mission");
  await expect(page.getByLabel("Planejamento e atividade")).toBeVisible();
  await expect(page.getByRole("link", { name: "← Voltar às entregas da turma", exact: true })).toHaveAttribute("href", "/aluno/entregas?turma=test-classroom");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByLabel("Planejamento e atividade")
    .fill("Meu planejamento preservado.");
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page.getByLabel("Planejamento e atividade")).toBeDisabled();
  await expect(
    page.getByText("Rascunho e etapa atual salvos no servidor.", {
      exact: true,
    }),
  ).toHaveCount(0);
  release();
  await expect(page.getByText(/O conteúdo mudou no servidor/)).toBeVisible();
  await expect(page.getByLabel("Planejamento e atividade")).toHaveValue(
    "Meu planejamento preservado.",
  );
  await expect(page.getByLabel("Planejamento e atividade")).toBeEnabled();
});
test("editor salva versão, exige revisão e publica somente a versão confirmada — transporte controlado", async ({
  page,
}) => {
  await fixture(page, "teacher");
  await page.goto("/professor/atividades/test-mission/editar");
  await page
    .getByLabel("Título da atividade", { exact: true })
    .fill("Atividade revisada de teste");
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar e revisar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisão antes de publicar" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Publicar atividade", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Revisei objetivos, critérios, etapas e materiais.")
    .check();
  await page
    .getByRole("button", { name: "Publicar atividade", exact: true })
    .click();
  await expect(
    page.getByText(
      "Atividade publicada pelo servidor e disponível para a turma.",
      { exact: true },
    ),
  ).toBeVisible();
});
test("rascunho de correção com IA exige autorização e validação docente antes de publicar", async ({ page }) => {
  await fixture(page, "teacher");
  const delivered = { ...submission, groupId: null, status: "submitted" as const, submittedAt: version.createdAt,
    content: "Resposta fictícia para comparar as alternativas.", gradingSteps: [{ id: "step-one", title: "Compreender o problema", dueAt: null,
      baseDueAt: null, deadlineExtended: false, completedAt: null, late: false, maxPoints: 10 }], feedback: [] };
  let generatedBody: unknown, publishedBody: unknown;
  await page.route("**/api/v1/activities/test-mission/submissions", route => route.fulfill({ json: { items: [delivered], nextCursor: null } }));
  await page.route("**/api/v1/submissions/test-submission/ai-feedback-draft", async route => {
    generatedBody = route.request().postDataJSON();
    await route.fulfill({ json: { id: "generation-feedback", status: "succeeded", draft: { content: "Explique como o segundo critério influencia sua escolha.",
      scores: [{ stepId: "step-one", points: 8, comment: "Justificativa coerente; desenvolva outro critério." }] } } });
  });
  await page.route("**/api/v1/submissions/test-submission/feedback", async route => {
    publishedBody = route.request().postDataJSON();
    await route.fulfill({ json: { ...delivered, status: "reviewed", feedback: [{ id: "feedback-one", content: "Explique como o segundo critério influencia sua escolha.", createdAt: version.createdAt, scores: [{ stepId: "step-one", points: 8, comment: "Justificativa coerente; desenvolva outro critério." }], totalPoints: 8 }] } });
  });
  await page.goto("/professor/entregas");
  await page.getByText("Consultar entrega e escrever feedback", { exact: true }).click();
  await page.getByText("Preparar correção e feedback com IA (opcional)", { exact: true }).click();
  const generate = page.getByRole("button", { name: "Gerar sugestão de correção e feedback", exact: true });
  await expect(generate).toBeDisabled();
  await page.getByRole("checkbox", { name: /Revisei a resposta e autorizo enviar seu texto ao Gemini/ }).check();
  await generate.click();
  await expect(page.getByLabel("Orientação para o próximo passo")).toHaveValue("Explique como o segundo critério influencia sua escolha.");
  await expect(page.getByLabel("Nota da etapa")).toHaveValue("8");
  expect(generatedBody).toMatchObject({ approvedForProvider: true });
  expect(publishedBody).toBeUndefined();
  await page.getByRole("checkbox", { name: "Conferi as notas e confirmo a avaliação final." }).check();
  await page.getByRole("button", { name: "Publicar feedback", exact: true }).click();
  expect(publishedBody).toMatchObject({ content: "Explique como o segundo critério influencia sua escolha.", scores: [{ stepId: "step-one", points: 8 }] });
  await expect(page.getByText("Feedback publicado pelo servidor.", { exact: true })).toBeVisible();
});
test("editor destaca pedidos de apoio autorizados antes de publicar a atividade", async ({ page }) => {
  await fixture(page, "teacher");
  await page.route("**/api/v1/classrooms/test-classroom/learning-needs**", route => route.fulfill({ json: {
    items: [{ userId: "student-a", name: "Aluno A", supports: ["short-steps"], preferredFormats: ["text"], disabilities: null }],
    nextCursor: null,
  } }));
  await page.goto("/professor/atividades/test-mission/editar");
  await page.getByRole("button", { name: "Continuar para as etapas →", exact: true }).click();
  await page.getByRole("button", { name: "Salvar e continuar →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pedidos de apoio compartilhados", exact: true })).toBeVisible();
  await expect(page.getByText("1 aluno compartilhou preferências de apoio com os docentes desta turma.", { exact: true })).toBeVisible();
  await expect(page.getByText("Aluno A", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Consultar pedidos e preparar adaptações", exact: true })).toHaveAttribute("href", "/professor/atividades/test-mission/adaptacoes");
});
test("planejamento manual mantém o título e dispensa o painel de escrita com IA", async ({
  page,
}) => {
  await fixture(page, "teacher");
  await page.goto("/professor/atividades/test-mission/editar");
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await expect(page.getByRole('button', { name: /Pedir ajuda à IA para escrever a atividade/ })).toHaveCount(0);
  await expect(
    page.getByLabel("Título da atividade", { exact: true }),
  ).toHaveValue(version.title);
  await expect(
    page.getByLabel("Título da atividade", { exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Salvar rascunho", exact: true }),
  ).toBeEnabled();
});

test("convite usa vínculo docente e revogação envia JSON ao proxy — transporte controlado", async ({
  page,
}) => {
  await fixture(page, "teacher");
  await page.goto("/professor");
  await page.getByText('Alunos da turma e convites', { exact: true }).click();
  await page.getByRole("button", { name: "Gerar convite de aluno" }).click();
  await expect(page.getByLabel("Código de convite")).toHaveValue(
    "ABCD2345",
  );
  await page.getByText("Convites ativos · 1", { exact: true }).click();
  await page.getByRole("button", { name: /^Desativar convite criado/ }).click();
  await expect(
    page.getByText("Convite desativado. O código e o link deixam de aceitar novas entradas. Quem já entrou continua na turma.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Código de convite")).toHaveCount(0);
});

test('preparação guiada valida a etapa atual, volta por teclado e preserva conteúdo quando salvar falha', async ({ page }) => {
  await fixture(page, 'teacher');
  await page.goto('/professor/atividades/test-mission/editar');
  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link')).toHaveCount(3);
  await page.getByLabel('Título da atividade', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await expect(page.getByLabel('Título da atividade', { exact: true })).toBeFocused();
  await page.getByLabel('Título da atividade', { exact: true }).fill('Atividade que quero preservar');
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  const instruction = page.getByRole('textbox', { name: 'Instrução', exact: true }).first();
  await instruction.fill('');
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await expect(instruction).toBeFocused();
  await instruction.fill('Compare as alternativas antes de escolher.');
  await page.getByRole('button', { name: '← Voltar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Título da atividade', { exact: true })).toHaveValue('Atividade que quero preservar');
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await expect(instruction).toHaveValue('Compare as alternativas antes de escolher.');
  await page.route('**/api/v1/activities/test-mission', async route => route.request().method() === 'PATCH' ? route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT' } }) : route.fallback());
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await expect(page.getByText(/O conteúdo mudou no servidor/)).toBeVisible();
  await expect(instruction).toHaveValue('Compare as alternativas antes de escolher.');
  await expect(page.getByRole('button', { name: 'Salvar e continuar →', exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 320, height: 850 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});


test('PDF selecionado permanece no campo ao voltar e ao recusar outro arquivo',async({page})=>{
 await fixture(page,'teacher');await page.goto('/professor/atividades/test-mission/editar');
 await page.getByRole('button',{name:'Continuar para as etapas →',exact:true}).click();
 const field=page.getByLabel('Adicionar PDF à atividade',{exact:true});
 const pdf={name:'material-escolhido.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nfixture')};
 await field.setInputFiles(pdf);
 const filename=()=>field.evaluate((node:HTMLInputElement)=>node.files?.[0]?.name??'');
 await expect.poll(filename).toBe(pdf.name);
 await expect(page.getByText(/PDF escolhido: material-escolhido.pdf/)).toBeVisible();
 await page.getByRole('button',{name:'← Voltar',exact:true}).click();
 await page.getByRole('button',{name:'Continuar para as etapas →',exact:true}).click();
 await expect.poll(filename).toBe(pdf.name);
 await field.setInputFiles({name:'arquivo-invalido.txt',mimeType:'text/plain',buffer:Buffer.from('Texto')});
 await expect(page.getByText('Escolha um PDF de até 20 MB.',{exact:true})).toBeVisible();
 await expect.poll(filename).toBe(pdf.name);
 const oversized = Buffer.alloc(20 * 1024 * 1024 + 1);
 pdf.buffer.copy(oversized);
 await field.setInputFiles({name:'acima-do-limite.pdf',mimeType:'application/pdf',buffer:oversized});
 await expect(page.getByText('Escolha um PDF de até 20 MB.',{exact:true})).toBeVisible();
 await expect.poll(filename).toBe(pdf.name);
 await field.setInputFiles([]);await expect.poll(filename).toBe(pdf.name);
 await field.setInputFiles({...pdf,name:'outro-material.pdf'});
 await expect.poll(filename).toBe('outro-material.pdf');
 await expect(page.getByText(/PDF escolhido: outro-material.pdf/)).toBeVisible();
});
