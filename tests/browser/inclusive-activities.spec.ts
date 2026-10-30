import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function fixture(page: Page, role: 'student' | 'teacher') {
  const captured: { needs?: Record<string, unknown>; sharing?: Record<string, unknown>; ai?: Record<string, unknown>; submission?: Record<string, unknown> } = {};
  const options = { supports: [{ id: 'short-steps', label: 'Tarefa dividida em passos curtos' }], disabilities: [{ id: 'visual', label: 'Visual' }], formats: [{ id: 'text', label: 'Texto no editor' }, { id: 'audio', label: 'Áudio de até 30 segundos' }, { id: 'text_file', label: 'Arquivo de texto (.txt)' }] };
  const v = { id: 'v-inclusive', missionId: 'm-inclusive', title: 'Atividade inclusiva', description: 'Compare propostas.', objectives: ['Justificar uma escolha.'], criteria: ['Explicar o raciocínio.'], source: 'manual', dueAt: null, createdAt: '2026-10-30T00:00:00.000Z', steps: [{ id: 's-inclusive', position: 1, title: 'Comparar', instructions: 'Compare propostas.', example: 'Dois custos.' }], materials: [{ id: 'material-inclusive', title: 'Material didático', text: 'Compare dois custos.', hasFile: false }] };
  const mission = { id: v.missionId, classroomId: 'c-inclusive', status: 'published', publishedVersion: v, draftVersion: null };
  let needs = { disabilities: [] as string[], supports: [] as string[], preferredFormats: [] as string[], revision: 0 };
  let share = { classroomId: 'c-inclusive', shared: false, includeDisabilities: false, revision: 0 };
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.slice('/api/v1'.length);
    const respond = (json: unknown) => route.fulfill({ json });
    if (path === '/me') return respond({ id: role, name: 'Pessoa fictícia', email: 'test@example.invalid', course: null, preferences: {}, demo: true });
    if (path === '/classrooms') return respond({ items: [{ id: 'c-inclusive', name: 'Turma inclusiva', role }], nextCursor: null });
    if (path === '/classrooms/c-inclusive/missions') return respond({ items: [mission], nextCursor: null });
    if (path === '/missions/m-inclusive') return respond(mission);
    if (path === '/missions/m-inclusive/submissions') {
      if (route.request().method() === 'POST') { captured.submission = route.request().postDataJSON(); return route.fulfill({ status: 409, json: { code: 'REVISION_CONFLICT' } }); }
      return respond({ items: [], nextCursor: null });
    }
    if (path === '/learning-options') return respond(options);
    if (path === '/me/learning-needs') {
      if (route.request().method() === 'PATCH') { captured.needs = route.request().postDataJSON(); needs = { ...needs, ...(captured.needs as typeof needs), revision: needs.revision + 1 }; share = { ...share, shared: false, includeDisabilities: false, revision: share.revision + 1 }; }
      return respond(needs);
    }
    if (path.endsWith('/needs-sharing')) {
      if (route.request().method() === 'PATCH') { captured.sharing = route.request().postDataJSON(); share = { ...share, ...(captured.sharing as typeof share), revision: share.revision + 1 }; }
      return respond(share);
    }
    if (path.endsWith('/learning-needs')) return respond({ items: [{ userId: 'student-a', name: 'Aluno A', supports: ['short-steps'], preferredFormats: ['audio'], disabilities: null }], nextCursor: null });
    if (path.endsWith('/strategy-recipients')) return respond({ items: [{ id: 'student-a', name: 'Aluno A' }, { id: 'student-b', name: 'Aluno B' }], nextCursor: null });
    if (path.endsWith('/adaptations')) {
      if (route.request().method() === 'POST') return route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT' } });
      return respond({ items: [] });
    }
    if (path.endsWith('/supports')) return respond({ versionId: v.id, items: [] });
    if (path.endsWith('/my-adaptations')) return respond({ versionId: v.id, allowedFormats: ['text', 'audio', 'text_file'], items: [{ id: 'adapt-a', stepId: null, instructions: 'Adaptação privada de A.', example: 'Um custo por vez.' }] });
    if (path.endsWith('/ai-supports')) { captured.ai = route.request().postDataJSON(); return respond({ id: 'ai-adapt', status: 'succeeded', draft: { items: [{ strategyId: 'written-instructions', content: 'Primeiro compare os custos.' }, { strategyId: 'worked-example', content: 'Exemplo: A custa menos que B.' }] } }); }
    return route.fulfill({ status: 404, json: {} });
  });
  return captured;
}
test('aluno escolhe apoios sem diagnóstico obrigatório e compartilha deficiência somente por opção separada', async ({ page }) => {
  const captured = await fixture(page, 'student'); await page.goto('/aluno/apoios');
  await page.getByRole('checkbox', { name: 'Tarefa dividida em passos curtos', exact: true }).check();
  await page.getByText('Informar deficiência autodeclarada (opcional)', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Visual', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar minhas escolhas', exact: true }).click();
  await expect(page.getByText('Escolhas salvas. Revise e autorize novamente as turmas com quem deseja compartilhar.', { exact: true })).toBeVisible();
  expect(captured.needs?.disabilities).toEqual(['visual']);
  await page.getByRole('checkbox', { name: 'Compartilhar apoios e preferências com docentes de Turma inclusiva', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar compartilhamento de Turma inclusiva', exact: true }).click();
  await expect(page.getByText('Compartilhamento salvo para os docentes desta turma.', { exact: true })).toBeVisible();
  expect(captured.sharing?.includeDisabilities).toBe(false);
  await page.getByRole('button', { name: 'Revogar compartilhamento de Turma inclusiva', exact: true }).click();
  await expect(page.getByText('Compartilhamento revogado. Novas consultas dos docentes serão bloqueadas.', { exact: true })).toBeVisible();
  expect(captured.sharing?.shared).toBe(false);
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});
test('professor usa pedidos autorizados e Gemini gera somente rascunho; erro preserva adaptação', async ({ page }) => {
  const captured = await fixture(page, 'teacher'); await page.goto('/professor/adaptacoes');
  await page.getByRole('button', { name: 'Preparar adaptação com os apoios de Aluno A', exact: true }).click();
  await page.getByText('Gerar rascunho de adaptação com Gemini', { exact: true }).click();
  const generate = page.getByRole('button', { name: 'Gerar adaptação com Gemini', exact: true });
  await expect(generate).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Material didático', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Conferi os textos e autorizo o envio de material didático sem dados pessoais ao Gemini.', exact: true }).check();
  await generate.click();
  await page.getByRole('button', { name: 'Usar rascunho adaptado no editor', exact: true }).click();
  expect(captured.ai?.supportNeeds).toEqual(['short-steps']);
  expect(captured.ai).not.toHaveProperty('studentIds'); expect(captured.ai).not.toHaveProperty('disabilities');
  await expect(page.getByLabel('Enunciado adaptado', { exact: true })).toHaveValue('Primeiro compare os custos.');
  await page.getByRole('checkbox', { name: 'Revisei a adaptação, os objetivos preservados, os formatos e os destinatários.', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar adaptação revisada', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('O conteúdo mudou');
  await expect(page.getByLabel('Enunciado adaptado', { exact: true })).toHaveValue('Primeiro compare os custos.');
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});
test('aluno envia arquivo de texto sem obrigar texto duplicado no editor e preserva arquivo em erro', async ({ page }) => {
  const captured = await fixture(page, 'student'); await page.goto('/aluno/missoes/m-inclusive');
  await page.getByLabel('Arquivo de texto da atividade (.txt, UTF-8, até 32 KiB)', { exact: true }).setInputFiles({ name: 'resposta.txt', mimeType: 'text/plain', buffer: Buffer.from('Minha resposta em arquivo.') });
  await expect(page.getByText('Arquivo de texto preparado para salvar.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar atividade', exact: true }).click();
  await expect(page.getByText('O conteúdo mudou no servidor. Preserve seu texto e consulte a versão atual antes de tentar novamente.', { exact: true })).toBeVisible();
  expect(captured.submission?.content).toBe(''); expect(captured.submission?.textFile).toEqual({ text: 'Minha resposta em arquivo.' });
  await expect(page.getByText('Arquivo de texto preparado para salvar.', { exact: true })).toBeVisible();
});
