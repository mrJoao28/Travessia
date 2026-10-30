import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus)
    await page.screenshot({ path: 'test-results/reference-real-failure.png', fullPage: true });
});

test("demonstração com API, PostgreSQL e Better Auth reais, sem respostas simuladas", async ({
  page,
}) => {
  if (
    !process.env.TRAVESSIA_WEB_TEST_URL ||
    !process.env.DEMO_USER_EMAIL ||
    !process.env.DEMO_USER_PASSWORD
  )
    throw new Error("Execute pelo runner de integração isolada.");
  page.setDefaultTimeout(15_000);
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
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await page.getByText('Pedir ajuda à IA para escrever a missão (opcional)', { exact: true }).click();
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
  await page.getByRole('button', { name: 'Etapa 1: Sobre a missão', exact: true }).click();
  await page
    .getByLabel("Título da missão", { exact: true })
    .fill(`${originalTitle} · revisão demonstrada`);
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
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
  // Same PostgreSQL and real sessions: teacher applies public/private supports,
  // learner A receives both, learner B never receives A's private support.
  await page.getByLabel('Email', { exact: true }).fill(process.env.DEMO_USER_EMAIL!);
  await page.getByLabel('Senha', { exact: true }).fill(process.env.DEMO_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/aluno\/?(?:\?|$)/);
  await page.goto('/professor/missoes/demo-class-oficina-mission/estrategias');
  await expect(page.getByRole('heading', { name: 'Escolha os apoios da missão', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Checklist do próximo passo', exact: true }).check();
  await page.getByLabel('Texto do apoio: Checklist do próximo passo', { exact: true }).fill('Apoio coletivo real: confira os requisitos antes de entregar.');
  await page.getByLabel('Onde disponibilizar', { exact: true }).selectOption({ label: 'Etapa 1 · Conhecer o desafio' });
  await page.getByRole('checkbox', { name: 'Revisei os textos, o destino e os destinatários dos apoios.', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar apoios', exact: true }).click();
  await expect(page.getByText('Apoios salvos e disponíveis aos destinatários selecionados.', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Exemplo comentado', exact: true }).check();
  await page.getByLabel('Texto do apoio: Exemplo comentado', { exact: true }).fill('Apoio individual de A: compare duas propostas e justifique sua escolha.');
  const audio = Buffer.alloc(32044); audio.write('RIFF'); audio.writeUInt32LE(audio.length - 8, 4); audio.write('WAVEfmt ', 8);
  audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(16000, 24);
  audio.writeUInt32LE(32000, 28); audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(32000, 40);
  await page.getByLabel('Áudio opcional deste apoio', { exact: true }).setInputFiles({ name: 'apoio-ficticio.wav', mimeType: 'audio/wav', buffer: audio });
  await expect(page.getByRole('button', { name: 'Remover áudio deste apoio', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Alunos selecionados', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Estudante Fictício 1', exact: true }).check();
  await page.getByRole('button', { name: 'Ver prévia do aluno', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prévia dos apoios para o aluno', exact: true })).toBeFocused();
  await page.getByRole('checkbox', { name: 'Revisei os textos, o destino e os destinatários dos apoios.', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar apoios', exact: true }).click();
  await expect(page.getByText('Apoios salvos e disponíveis aos destinatários selecionados.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Aplicações salvas', exact: true }).getByText('Alunos selecionados: Estudante Fictício 1', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/reference-strategies-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/reference-strategies-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  async function logout() {
    await page.locator('summary[aria-label="Menu da conta"]').click();
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  }
  // Create from the same empty editor a teacher uses, without API writes.
  await page.goto('/professor?turma=demo-class-oficina');
  await page.getByRole('link', { name: 'Criar missão', exact: true }).click();
  await page.getByLabel('Título da missão', { exact: true }).fill('Atividade inclusiva de teste');
  await page.getByLabel('Descrição', { exact: true }).fill('Compare propostas e justifique sua escolha.');
  await page.getByLabel('Objetivos de aprendizagem · um por linha', { exact: true }).fill('Justificar uma escolha.');
  await page.getByLabel('Critérios de avaliação · um por linha', { exact: true }).fill('Explicar o raciocínio.');
  await page.screenshot({ path: 'test-results/reference-editor-guided-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await page.getByLabel('Título da etapa', { exact: true }).fill('Comparar propostas');
  await page.getByLabel('Instrução', { exact: true }).fill('Compare as propostas.');
  await page.getByLabel('Exemplo de apoio', { exact: true }).fill('Compare dois custos.');
  await page.getByRole('button', { name: 'Adicionar material textual', exact: true }).click();
  await page.getByLabel('Título do material', { exact: true }).fill('Texto didático público fictício');
  await page.getByRole('textbox', { name: 'Texto do material', exact: true }).fill('Compare custo e clareza.');
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByText('Rascunho salvo no servidor. Ainda não publicado.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/professor\/missoes\/[^/]+\/editar$/);
  const createdMissionId = new URL(page.url()).pathname.split('/')[3];
  const savedDraft = await (await page.request.get(`/api/v1/missions/${createdMissionId}`)).json();
  expect(savedDraft.draftVersion.materials).toMatchObject([{ title: 'Texto didático público fictício', text: 'Compare custo e clareza.' }]);
  await expect(page.getByRole('textbox', { name: 'Texto do material', exact: true })).toHaveValue('Compare custo e clareza.');
  await page.reload();
  await expect(page.getByLabel('Título da missão', { exact: true })).toHaveValue('Atividade inclusiva de teste');
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Texto do material', exact: true })).toHaveValue('Compare custo e clareza.');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/reference-editor-real-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e revisar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Revisão antes de publicar', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Publicar missão', exact: true })).toBeDisabled();
  await page.getByLabel('Revisei objetivos, critérios, etapas e materiais.', { exact: true }).check();
  await page.getByRole('button', { name: 'Publicar missão', exact: true }).click();
  await expect(page.getByText('Missão publicada pelo servidor e disponível para a turma.', { exact: true })).toBeVisible();
  // Read only: capture the authoritative published version for later assertions.
  const createdMissionResponse = await page.request.get(`/api/v1/missions/${createdMissionId}`);
  expect(createdMissionResponse.status()).toBe(200);
  const inclusiveMission = await createdMissionResponse.json();
  await page.getByRole('link', { name: 'Preparar apoios desta missão', exact: true }).click();
  await page.getByRole('link', { name: 'Preparar adaptação', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link')).toHaveCount(3);
  await page.getByLabel('Destinatários da adaptação', { exact: true }).selectOption('students');
  await page.getByRole('checkbox', { name: 'Estudante Fictício 1', exact: true }).check();
  await page.getByRole('button', { name: 'Continuar para a atividade →', exact: true }).click();
  await page.getByLabel('Enunciado adaptado', { exact: true }).fill('Adaptação real: compare primeiro o custo e depois a clareza. Justifique sua escolha.');
  await page.getByText(/^Formas de entrega/).click();
  await page.getByRole('checkbox', { name: 'Áudio de até 30 segundos', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Arquivo de texto (.txt)', exact: true }).check();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/reference-adaptations-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/reference-adaptations-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Conferir adaptação →', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Revisei a adaptação, os objetivos preservados, os formatos e os destinatários.', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar adaptação revisada', exact: true }).click();
  await expect(page.getByText('Adaptação revisada e disponível aos destinatários.', { exact: true })).toBeVisible();
  await logout();
  for (const suffix of ['A', 'B']) {
    await page.getByLabel('Email', { exact: true }).fill(process.env[`SUPPORT_STUDENT_${suffix}_EMAIL`]!);
    await page.getByLabel('Senha', { exact: true }).fill(process.env[`SUPPORT_STUDENT_${suffix}_PASSWORD`]!);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/aluno\/?(?:\?|$)/);
    await page.goto('/aluno/missoes/demo-class-oficina-mission');
    await page.getByRole('button', { name: /^Conhecer o desafio(?: · concluída e salva)?$/ }).click({ timeout: 15_000 });
    const supports = page.getByRole('region', { name: 'Apoios desta etapa', exact: true });
    await expect(supports.getByText('Checklist do próximo passo', { exact: true })).toBeVisible();
    if (suffix === 'A') {
      await supports.getByText('Exemplo comentado', { exact: true }).click();
      await expect(supports.getByText('Apoio individual de A: compare duas propostas e justifique sua escolha.', { exact: true })).toBeVisible();
      await supports.getByRole('button', { name: 'Carregar áudio do apoio', exact: true }).click();
      await expect(supports.locator('audio')).toHaveAttribute('src', /^blob:/);

    } else {
      await expect(supports.getByText('Exemplo comentado', { exact: true })).toHaveCount(0);
      const versionId = await page.evaluate(async () => (await (await fetch('/api/v1/missions/demo-class-oficina-mission')).json()).publishedVersion.id as string);
      const response = await page.request.get(`/api/v1/missions/demo-class-oficina-mission/supports?versionId=${encodeURIComponent(versionId)}`);
      expect(await response.text()).not.toContain('Apoio individual de A');
    }
    await page.getByRole('button', { name: 'Próxima etapa', exact: true }).click();
    await expect(supports.getByRole('status')).toHaveCount(0);
    await expect(supports.getByText('Checklist do próximo passo', { exact: true })).toHaveCount(0);
    if (suffix === 'A') {
      await page.goto('/aluno/apoios');
      await page.getByRole('checkbox', { name: 'Tarefa dividida em passos curtos', exact: true }).check();
      await page.getByText('Informar deficiência autodeclarada (opcional)', { exact: true }).click();
      await page.getByRole('checkbox', { name: 'Visual', exact: true }).check();
      await page.getByRole('button', { name: 'Salvar minhas escolhas', exact: true }).click();
      await expect(page.getByText('Escolhas salvas. Revise e autorize novamente as turmas com quem deseja compartilhar.', { exact: true })).toBeVisible();
      await page.getByRole('checkbox', { name: 'Compartilhar apoios e preferências com docentes de Oficina de Projetos Inclusivos', exact: true }).check();
      await page.getByRole('button', { name: 'Salvar compartilhamento de Oficina de Projetos Inclusivos', exact: true }).click();
      await expect(page.getByText('Compartilhamento salvo para os docentes desta turma.', { exact: true })).toBeVisible();
      await page.screenshot({ path: 'test-results/reference-learning-needs.png', fullPage: true });
    }
    await page.goto(`/aluno/missoes/${inclusiveMission.id}`);
    await expect(page.getByText('Justificar uma escolha.', { exact: true })).toBeVisible();
    await expect(page.getByText('Explicar o raciocínio.', { exact: true })).toBeVisible();
    if (suffix === 'A') {
      await page.getByText('Consultar enunciado adaptado', { exact: true }).click();
      await expect(page.getByText('Adaptação real: compare primeiro o custo e depois a clareza. Justifique sua escolha.', { exact: true })).toBeVisible();
      await page.getByLabel('Áudio da atividade (opcional)', { exact: true }).setInputFiles({ name: 'resposta.wav', mimeType: 'audio/wav', buffer: audio });
      await expect(page.getByRole('button', { name: 'Remover áudio deste apoio', exact: true })).toBeVisible();
      await page.getByLabel('Arquivo de texto da atividade (.txt, UTF-8, até 32 KiB)', { exact: true }).setInputFiles({ name: 'resposta.txt', mimeType: 'text/plain', buffer: Buffer.from('Arquivo privado do aluno A: comparo duas propostas.') });
      await expect(page.getByText('Arquivo de texto preparado para salvar.', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
      await expect(page.getByText('Rascunho e etapa atual salvos no servidor.', { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Carregar áudio da atividade', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Enviar atividade', exact: true }).click();
      await expect(page.getByText('Atividade enviada. Aguarde o feedback do professor.', { exact: true })).toBeVisible();
    } else {
      await expect(page.getByText('Consultar enunciado adaptado', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Áudio da atividade (opcional)', { exact: true })).toHaveCount(0);
      const plans = await page.request.get(`/api/v1/missions/${inclusiveMission.id}/my-adaptations?versionId=${inclusiveMission.publishedVersion.id}`);
      expect((await plans.json()).allowedFormats).toEqual(['text']);
    }
    await logout();
  }
  await page.getByLabel('Email', { exact: true }).fill(process.env.DEMO_USER_EMAIL!);
  await page.getByLabel('Senha', { exact: true }).fill(process.env.DEMO_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/aluno\/?(?:\?|$)/);
  const sharedNeeds = await (await page.request.get('/api/v1/classrooms/demo-class-oficina/learning-needs')).json();
  const learnerA = sharedNeeds.items.find((n: { userId: string }) => n.userId === 'demo-student-1');
  expect(learnerA.supports).toContain('short-steps'); expect(learnerA.disabilities).toBeNull();
  const submittedResponse = await page.request.get(`/api/v1/missions/${inclusiveMission.id}/submissions`);
  expect(submittedResponse.status()).toBe(200);
  expect((await submittedResponse.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ userId: 'demo-student-1', status: 'submitted' })]));
  await page.goto('/professor/entregas');
  const deliveryHeading = page.getByRole('heading', { name: 'Entregas para acompanhar', exact: true });
  const limitNotice = page.getByText('O limite de solicitações foi atingido. Aguarde antes de tentar novamente.', { exact: true });
  await expect(deliveryHeading.or(limitNotice)).toBeVisible();
  // The comprehensive dev-browser scenario can exceed the real 300/minute
  // per-user budget. Exercise its visible retry instead of bypassing/resetting
  // the limiter or treating a temporary limit as a missing delivery.
  if (await limitNotice.isVisible()) {
    await expect(async () => {
      if (await deliveryHeading.isVisible()) return;
      if (await limitNotice.isVisible())
        await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
      await expect(deliveryHeading).toBeVisible({ timeout: 2500 });
    }).toPass({ timeout: 75_000, intervals: [5000, 10000, 15000] });
  }
  const delivery = page.locator('li.paper').filter({ has: page.getByRole('heading', { name: 'Atividade inclusiva de teste', exact: true }) });
  await expect(delivery).toBeVisible();
  await delivery.getByText('Consultar entrega e escrever feedback', { exact: true }).click();
  await delivery.getByRole('button', { name: 'Carregar áudio da atividade', exact: true }).click();
  await expect(delivery.locator('audio')).toHaveAttribute('src', /^blob:/);
  const fileDownload = page.waitForEvent('download');
  await delivery.getByRole('button', { name: 'Baixar arquivo de texto da atividade', exact: true }).click();
  expect((await fileDownload).suggestedFilename()).toBe('atividade.txt');
  const feedback = 'Sua comparação está clara. No próximo passo, justifique como o custo e a clareza orientaram a escolha.';
  await delivery.getByLabel('Orientação para o próximo passo', { exact: true }).fill(feedback);
  await delivery.getByRole('button', { name: 'Publicar feedback', exact: true }).click();
  await expect(delivery.getByText('Feedback publicado pelo servidor.', { exact: true })).toBeVisible();
  await logout();
  await page.getByLabel('Email', { exact: true }).fill(process.env.SUPPORT_STUDENT_A_EMAIL!);
  await page.getByLabel('Senha', { exact: true }).fill(process.env.SUPPORT_STUDENT_A_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/aluno\/?(?:\?|$)/);
  await page.goto(`/aluno/missoes/${inclusiveMission.id}`);
  await expect(page.getByText(feedback, { exact: true })).toBeVisible();
  await expect(page.getByText('Revisada', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Planejamento e atividade', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(feedback, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Carregar áudio da atividade', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/reference-feedback-real-mobile.png', fullPage: true });
});
