import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("demonstração com API, PostgreSQL e Better Auth reais, sem respostas simuladas", async ({
  page,
}) => {
  if (
    !process.env.TRAVESSIA_WEB_TEST_URL ||
    !process.env.DEMO_USER_EMAIL ||
    !process.env.DEMO_USER_PASSWORD
  )
    throw new Error("Execute pelo runner de integração isolada.");
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.DEMO_USER_EMAIL);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.DEMO_USER_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Continuar missão" }),
  ).toBeVisible();
  await expect(
    page.getByText("Etapa 2 de 5 · Planejar a solução", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ambiente de demonstração · dados fictícios", {
      exact: true,
    }),
  ).toBeVisible();
  await page.locator('summary[aria-label="Menu da conta"]').click();
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
  await page.getByLabel('Telefone (opcional)', { exact: true }).fill('+55 92 90000-0000');
  await page.getByRole('button', { name: 'Salvar dados da conta', exact: true }).click();
  await expect(page.getByText('Dados de contato salvos.', { exact: true })).toBeVisible();
  await page.getByLabel('Matrícula', { exact: true }).fill('2026001');
  await page.getByLabel('Unidade / campus', { exact: true }).fill('EST');
  await page.getByLabel('Período', { exact: true }).fill('2º');
  await page.getByRole('button', { name: 'Salvar perfil de aluno', exact: true }).click();
  await expect(page.getByText('Perfil de aluno salvo.', { exact: true })).toBeVisible();
  await page.getByLabel('Disciplina 1', { exact: true }).fill('Cálculo I');
  await page.getByLabel('Curso 1', { exact: true }).fill('Engenharia de Computação');
  await page.getByRole('button', { name: 'Adicionar disciplina e curso', exact: true }).click();
  await expect(page.getByLabel('Disciplina 2', { exact: true })).toBeFocused();
  await page.getByLabel('Disciplina 2', { exact: true }).fill('Cálculo I');
  await page.getByLabel('Curso 2', { exact: true }).fill('Engenharia Elétrica');
  await page.getByRole('button', { name: 'Salvar perfil de professor', exact: true }).click();
  await expect(page.getByText('Perfil de professor salvo.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Telefone (opcional)', { exact: true })).toHaveValue('+55 92 90000-0000');
  await expect(page.getByLabel('Matrícula', { exact: true })).toHaveValue('2026001');
  await expect(page.getByLabel('Curso 2', { exact: true })).toHaveValue('Engenharia Elétrica');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/reference-profile-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/reference-profile-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Remover disciplina e curso 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Adicionar disciplina e curso', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Salvar perfil de professor', exact: true }).click();
  await expect(page.getByText('Perfil de professor salvo.', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: 'Voltar ao meu espaço', exact: true }).click();
  await page.getByRole("link", { name: "Continuar missão" }).click();
  await expect(page.getByLabel("Planejamento e atividade")).toBeVisible();
  await page.getByText("Aa · Ajustar leitura", { exact: true }).click();
  await page.getByLabel("Tamanho do texto").selectOption("1.125");
  await page
    .getByRole("button", { name: "Salvar preferências na conta" })
    .click();
  await expect(
    page.getByText("Preferências salvas na sua conta.", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Planejamento e atividade")
    .fill(
      "Planejamento fictício verificado no navegador: cadastrar, consultar e registrar empréstimos.",
    );
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho e etapa atual salvos no servidor.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Planejamento e atividade")).toHaveValue(
    "Planejamento fictício verificado no navegador: cadastrar, consultar e registrar empréstimos.",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "style",
    /font-size: 112.5%/,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Enviar atividade', exact: true }).click();
  await expect(page.getByText('Atividade enviada. Aguarde o feedback do professor.', { exact: true })).toBeVisible();
  await page.getByLabel('O que dificultou esta etapa?').fill('Exemplo de relato privado criado no teste integrado.');
  await page.getByRole('button', { name: 'Enviar relato', exact: true }).click();
  await expect(page.getByText('Relato privado salvo. Somente você pode consultá-lo.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Consultar meus relatos e respostas' }).click();
  await expect(page.getByText('Exemplo de relato privado criado no teste integrado.', { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Feedback", exact: true }).click();
  await expect(page.locator("blockquote").first()).toBeVisible();
  await expect(page.getByText("Revisada", { exact: true })).toBeVisible();
  await page.locator('summary[aria-label="Menu da conta"]').click();
  await page
    .getByRole("link", { name: "Ir para o espaço do professor" })
    .click();
  await expect(
    page.getByRole("link", { name: "Consultar entregas", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Consultar entregas", exact: true })
    .click();
  await page
    .getByText("Consultar entrega e escrever feedback", { exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Orientação para o próximo passo" })
    .first()
    .fill(
      "A proposta está clara. Acrescente um exemplo de como verificar a alternativa textual.",
    );
  await page
    .getByRole("button", { name: "Publicar feedback", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Feedback publicado pelo servidor.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Apoios e barreiras", exact: true })
    .click();
  await expect(
    page.getByText("O material está disponível apenas como imagem", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Responder ao estudante")
    .fill("Vou disponibilizar uma alternativa em texto para esse material.");
  await page
    .getByRole("button", { name: "Enviar resposta", exact: true })
    .click();
  await expect(
    page.getByText("Resposta salva e disponível para o autor do relato.", {
      exact: true,
    }),
  ).toBeVisible();
  const missionId = await page.evaluate(async () => {
    const classrooms = await (await fetch("/api/v1/classrooms")).json();
    const classroom = classrooms.items.find(
      (room: { role: string }) => room.role === "teacher",
    );
    const missions = await (
      await fetch(
        `/api/v1/classrooms/${encodeURIComponent(classroom.id)}/missions`,
      )
    ).json();
    return missions.items.find(
      (mission: { status: string }) => mission.status === "draft",
    ).id as string;
  });
  await page.goto(`/professor/missoes/${encodeURIComponent(missionId)}/editar`);
  await expect(
    page.getByLabel("Título da missão", { exact: true }),
  ).toBeVisible();
  const originalTitle = await page
    .getByLabel("Título da missão", { exact: true })
    .inputValue();
  await page
    .getByRole("group", { name: "Materiais que serão enviados" })
    .getByRole("checkbox")
    .first()
    .check();
  await page
    .getByLabel(
      "Revisei os textos selecionados e autorizo seu envio ao provedor.",
    )
    .check();
  await page
    .getByRole("button", { name: "Solicitar rascunho", exact: true })
    .click();
  await expect(
    page.getByText(
      "A assistência está desativada. Você pode continuar editando manualmente.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel("Título da missão", { exact: true }),
  ).toHaveValue(originalTitle);
  await page
    .getByLabel("Título da missão", { exact: true })
    .fill(`${originalTitle} · revisão demonstrada`);
  await page
    .getByRole("button", { name: "Salvar e revisar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisão antes de publicar" }),
  ).toBeFocused();
  await page
    .getByLabel("Revisei objetivos, critérios, etapas e materiais.")
    .check();
  await page
    .getByRole("button", { name: "Publicar missão", exact: true })
    .click();
  await expect(
    page.getByText(
      "Missão publicada pelo servidor e disponível para a turma.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.locator('summary[aria-label="Menu da conta"]').click();
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});
