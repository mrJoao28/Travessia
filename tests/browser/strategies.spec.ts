import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ApiBody, ApiResponse } from '../../apps/web/lib/api.generated';

async function fixture(page: Page, failSave = false) {
  const version: NonNullable<ApiResponse<'mission'>['publishedVersion']> = { id: 'version-support', missionId: 'mission-support',
    title: 'Missão fictícia', description: 'Conteúdo de teste.', objectives: ['Comparar propostas.'], criteria: ['Justificar a escolha.'],
    source: 'manual', dueAt: null, createdAt: '2026-10-30T00:00:00.000Z', materials: [{ id: "material-support", title: "Material fictício", text: "Compare custo e clareza.", hasFile: false }],
    steps: [{ id: 'step-support', position: 1, title: 'Comparar', instructions: 'Compare propostas.', example: 'Compare duas propostas.' }] };
  const mission: ApiResponse<'mission'> = { id: version.missionId, classroomId: 'class-support', status: 'published', draftVersion: null, publishedVersion: version };
  const catalog: ApiResponse<'strategyCatalog'>['items'] = [
    { id: 'step-checklist', title: 'Checklist do próximo passo', category: 'Planejamento', description: 'Organize as ações.', guidance: 'Revise para sua missão.', example: 'Liste os dados e confira os requisitos.' },
    { id: 'context-glossary', title: 'Glossário contextual', category: 'Compreensão', description: 'Explique os termos.', guidance: 'Escolha termos da atividade.', example: 'Acervo: conjunto de livros.' },
  ];
  let submitted: ApiBody<'createStrategyPlan'> | undefined;
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.slice('/api/v1'.length);
    const respond = (json: unknown) => route.fulfill({ json });
    if (path === '/me') return respond({ id: 'teacher-support', name: 'Professor fictício', email: 'teacher@example.invalid', course: null, demo: true, preferences: {} });
    if (path === '/classrooms') return respond({ items: [{ id: 'class-support', name: 'Turma fictícia', role: 'teacher' }], nextCursor: null });
    if (path === '/classrooms/class-support/missions') return respond({ items: [mission], nextCursor: null });
    if (path === '/missions/mission-support/submissions') return respond({ items: [], nextCursor: null });
    if (path === '/strategies') return respond({ items: catalog });
    if (path.endsWith('/strategy-recipients')) return respond({ items: [{ id: 'student-support', name: 'Estudante fictício' }], nextCursor: null });
    if (path.endsWith('/strategy-plans') && route.request().method() === 'GET') return respond({ items: [] });
    if (path.endsWith('/strategy-plans') && route.request().method() === 'POST') {
      submitted = route.request().postDataJSON() as ApiBody<'createStrategyPlan'>;
      if (failSave) return route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT' } });
      return respond({ id: 'saved-plan', versionId: submitted.versionId, stepId: submitted.stepId, audience: submitted.audience, revision: 1,
        items: submitted.items.map((item, index) => ({ ...item, id: `saved-${index}`, title: catalog.find(s => s.id === item.strategyId)!.title })),
        recipients: submitted.studentIds.map(id => ({ id, name: 'Estudante fictício' })) });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/professor/estrategias');
  await expect(page.getByRole('heading', { name: 'Escolha os apoios da missão', exact: true })).toBeVisible();
  return () => submitted;
}

test('estratégias preservam textos, destino e destinatários quando o salvamento falha', async ({ page }) => {
  const submitted = await fixture(page, true);
  await page.getByRole('checkbox', { name: 'Checklist do próximo passo', exact: true }).check();
  await page.getByLabel('Texto do apoio: Checklist do próximo passo', { exact: true }).fill('Conteúdo que precisa ser preservado.');
  await page.getByLabel('Onde disponibilizar', { exact: true }).selectOption('step-support');
  await page.getByRole('radio', { name: 'Alunos selecionados', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Estudante fictício', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Salvar apoios', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Revisei os textos, o destino e os destinatários dos apoios.', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar apoios', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('O conteúdo mudou no servidor');
  await expect(page.getByLabel('Texto do apoio: Checklist do próximo passo', { exact: true })).toHaveValue('Conteúdo que precisa ser preservado.');
  await expect(page.getByRole('checkbox', { name: 'Estudante fictício', exact: true })).toBeChecked();
  expect(submitted()?.studentIds).toEqual(['student-support']);
  expect(submitted()?.stepId).toBe('step-support');
});

test('busca mantém estratégias selecionadas e a prévia é acessível por teclado', async ({ page }) => {
  await fixture(page);
  await page.getByRole('checkbox', { name: 'Checklist do próximo passo', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByLabel('Texto do apoio: Checklist do próximo passo', { exact: true }).fill('Planeje sua resposta em três ações.');
  await page.getByLabel('Buscar estratégia', { exact: true }).fill('glossário');
  await expect(page.getByRole('checkbox', { name: 'Glossário contextual', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Checklist do próximo passo', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Texto do apoio: Checklist do próximo passo', { exact: true })).toHaveValue('Planeje sua resposta em três ações.');
  await page.getByRole('button', { name: 'Ver prévia do aluno', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prévia dos apoios para o aluno', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});

test('Gemini exige seleção e consentimento e retorna rascunho sem publicar nem substituir o texto', async ({ page }) => {
  const submitted = await fixture(page);
  let providerBody: ApiBody<'generateSupports'> | undefined;
  await page.route('**/api/v1/missions/mission-support/ai-supports', async route => {
    providerBody = route.request().postDataJSON();
    return route.fulfill({ json: { id: 'support-generation', status: 'succeeded', draft: { items: [{ strategyId: 'step-checklist', content: 'Confira os custos. Compare a clareza.' }] } } });
  });
  await page.getByRole('checkbox', { name: 'Checklist do próximo passo', exact: true }).check();
  const text = page.getByLabel('Texto do apoio: Checklist do próximo passo', { exact: true });
  await text.fill('Texto original preservado.');
  const button = page.getByRole('button', { name: 'Gerar apoios com Gemini', exact: true });
  await expect(button).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Material fictício', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Conferi o conteúdo e autorizo seu envio ao Gemini.', exact: false }).check();
  await button.click();
  await expect(page.getByText('Rascunhos preparados. Confira cada texto antes de usá-lo.', { exact: true })).toBeVisible();
  await expect(text).toHaveValue('Texto original preservado.');
  expect(submitted()).toBeUndefined();
  expect(providerBody?.materialIds).toEqual(['material-support']);
  expect(providerBody?.strategyIds).toEqual(['step-checklist']);
  expect(providerBody).not.toHaveProperty('studentIds');
  await page.getByRole('button', { name: 'Usar este rascunho no apoio', exact: true }).click();
  await expect(text).toHaveValue('Confira os custos. Compare a clareza.');
  await expect(page.getByRole('checkbox', { name: 'Revisei os textos, o destino e os destinatários dos apoios.', exact: true })).not.toBeChecked();
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});
test('Gemini indisponível preserva a edição manual e não anuncia geração concluída', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/v1/missions/mission-support/ai-supports', route => route.fulfill({ status: 503, json: { code: 'AI_UNAVAILABLE' } }));
  await page.getByRole('checkbox', { name: 'Checklist do próximo passo', exact: true }).check();
  const text = page.getByLabel('Texto do apoio: Checklist do próximo passo', { exact: true });
  await text.fill('Planejamento preservado.');
  await page.getByRole('checkbox', { name: 'Material fictício', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Conferi o conteúdo e autorizo seu envio ao Gemini.', exact: false }).check();
  await page.getByRole('button', { name: 'Gerar apoios com Gemini', exact: true }).click();
  await expect(page.getByText('A assistência está desativada. Você pode continuar editando manualmente.', { exact: true })).toBeVisible();
  await expect(text).toHaveValue('Planejamento preservado.');
  await expect(page.getByRole('button', { name: 'Usar este rascunho no apoio', exact: true })).toHaveCount(0);
});
