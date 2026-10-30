import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { createApplication } from '../src/runtime.js';
import { readConfig } from '../src/config.js';
import { createAuth } from '../src/auth.js';
import { seedDemo } from '../src/seed.js';
import type { MissionInput } from '../src/contracts.js';

const db = new PrismaClient({ log: [] });
const config = readConfig();
const fixture: MissionInput = { title: 'Missão de teste', description: 'Conteúdo didático fictício.', objectives: ['Comparar soluções.'],
  criteria: ['Justificar a escolha.'], steps: [{ title: 'Comparar', instructions: 'Compare duas soluções.', example: 'Uma tabela de alternativas.' }],
  materials: [{ title: 'Material público fictício', text: 'Compare custo e clareza de duas soluções.' }] };
let base: string;
let runtime: Awaited<ReturnType<typeof createApplication>>;
let main: string, a: string, b: string, otherTeacher: string;
let mainId: string;
let providerCalls = 0;
let providerInput = '';
let release: (() => void) | undefined;
let hold = false;
let invalidOutput = false;
let userPasswordHash: string;
const testPassword = 'fictional-test-password-90817';
const workshop = 'demo-class-oficina';

async function request(path: string, cookie = '', method = 'GET', body?: unknown, status = 200, origin = config.origin) {
  const response = await fetch(base + path, { method, headers: { cookie, origin, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(json)}`);
  return { json, response };
}
async function login(email: string, password: string) {
  const { response } = await request('/api/auth/sign-in/email', '', 'POST', { email, password });
  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.some(c => /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)));
  return cookies.map(c => c.split(';')[0]).join('; ');
}
async function provision(id: string) {
  const ctx = await createAuth(db, config).$context;
  const old = await db.user.findUnique({ where: { id } });
  const user = old ?? await ctx.internalAdapter.createUser({ name: 'Pessoa Fictícia', email: `${id}@example.invalid`, emailVerified: true }, { method: 'admin' });
  await ctx.internalAdapter.createAccount({ userId: user.id, accountId: user.id, providerId: 'credential', password: userPasswordHash });
  return { user, cookie: await login(user.email, testPassword) };
}
before(async () => {
  const seeded = await seedDemo(db, config); mainId = seeded.userId;
  const counts = await Promise.all([db.user.count(), db.classroom.count(), db.mission.count(), db.submission.count(), db.feedback.count(), db.barrierReport.count()]);
  const draft = await db.submission.findFirstOrThrow({ where: { userId: mainId, status: 'draft' } });
  await db.submission.update({ where: { id: draft.id }, data: { content: 'Alteração que o seed deve preservar.' } });
  const account = await db.account.findFirstOrThrow({ where: { userId: mainId } });
  assert.ok(account.password && account.password !== process.env.DEMO_USER_PASSWORD);
  await seedDemo(db, config);
  assert.deepEqual(await Promise.all([db.user.count(), db.classroom.count(), db.mission.count(), db.submission.count(), db.feedback.count(), db.barrierReport.count()]), counts);
  assert.equal((await db.submission.findUniqueOrThrow({ where: { id: draft.id } })).content, 'Alteração que o seed deve preservar.');
  assert.equal((await db.account.findFirstOrThrow({ where: { userId: mainId } })).password, account.password);
  runtime = await createApplication(db, config, async (input, signal) => {
    providerCalls++; providerInput = JSON.stringify(input);
    if (hold) await new Promise<void>((resolve, reject) => { release = resolve; signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }); });
    return { draft: invalidOutput ? { title: 'Inválido' } : fixture, inputTokens: 100, outputTokens: 200 };
  });
  await runtime.app.listen(0, '127.0.0.1'); base = await runtime.app.getUrl();
  main = await login(process.env.DEMO_USER_EMAIL!, process.env.DEMO_USER_PASSWORD!);
  userPasswordHash = await (await createAuth(db, config).$context).password.hash(testPassword);
  a = (await provision('demo-student-1')).cookie;
  b = (await provision('demo-student-2')).cookie;
  otherTeacher = (await provision('demo-teacher-programacao')).cookie;
}, { timeout: 90000 });
after(async () => { await runtime?.app.close(); await db.$disconnect(); });

test('health público, sessão inválida, CSRF e cadastro fechado', async () => {
  await request('/v1/health');
  await request('/v1/me', '', 'GET', undefined, 401);
  await request('/v1/me', 'better-auth.session_token=forged', 'GET', undefined, 401);
  await request('/api/auth/sign-up/email', '', 'POST', {}, 404);
  await request('/v1/classrooms', main, 'POST', { name: 'Teste' }, 403, 'https://attacker.invalid');
  await request('/v1/me/preferences', main, 'PATCH', { role: 'teacher' }, 400);
});
test('seed real: três contextos aluno, um docente, biblioteca 2/5, feedback e oito alunos', async () => {
  const me = (await request('/v1/me', main)).json;
  assert.equal(me.name, 'Joao Felipe'); assert.equal(me.course, 'Engenharia da Computação');
  const classes = (await request('/v1/classrooms', main)).json.items;
  assert.equal(classes.filter((c: any) => c.role === 'student').length, 3);
  assert.equal(classes.filter((c: any) => c.role === 'teacher').length, 1);
  const library = (await request('/v1/missions/demo-class-programacao-mission', main)).json;
  assert.equal(library.publishedVersion.title, 'Uma biblioteca para todos'); assert.equal(library.publishedVersion.steps.length, 5);
  const progress = (await request('/v1/missions/demo-class-programacao-mission/submissions', main)).json.items[0];
  assert.equal(progress.currentStepId, library.publishedVersion.steps[1].id);
  const stats = (await request('/v1/missions/demo-class-estatistica-mission/submissions', main)).json.items[0];
  assert.equal(stats.status, 'reviewed'); assert.equal(stats.feedback.length, 1);
  const members = (await request(`/v1/classrooms/${workshop}/members`, main)).json.items;
  assert.equal(members.filter((m: any) => m.role === 'student').length, 8);
});
test('preferências privadas e autorização de turmas/papéis resolvida no banco', async () => {
  await request('/v1/me/preferences', a, 'PATCH', { fontSize: 'larger', spacing: 'wide' });
  assert.equal((await request('/v1/me', a)).json.preferences.fontSize, 'larger');
  assert.notEqual((await request('/v1/me', b)).json.preferences.fontSize, 'larger');
  await request(`/v1/classrooms/${workshop}/missions`, otherTeacher, 'GET', undefined, 404);
  await request(`/v1/classrooms/${workshop}/missions`, a, 'POST', fixture, 404);
  await request(`/v1/classrooms/${workshop}/invitations`, a, 'POST', { role: 'teacher' }, 400);
  await request('/v1/classrooms?limit=1000', main, 'GET', undefined, 400);
});
test('perfis acadêmicos próprios: aluno e professor na mesma conta, campos parciais e contatos privados', async () => {
  await request('/v1/me/profile', '', 'GET', undefined, 401);
  await request('/v1/me/profile', 'better-auth.session_token=forged', 'PATCH', { phone: '999' }, 401);
  const beforeB = (await request('/v1/me/profile', b)).json;
  const memberships = await db.membership.findMany({ where: { userId: 'demo-student-1' }, orderBy: { id: 'asc' } });
  const hash = (await db.account.findFirstOrThrow({ where: { userId: 'demo-student-1', providerId: 'credential' } })).password;
  const saved = (await request('/v1/me/profile', a, 'PATCH', {
    name: 'Aluno e professor fictício', phone: '+55 92 90000-0000', alternateEmail: 'contact@example.invalid',
    student: { registration: '2026001', institution: 'UEA', unit: 'EST', course: 'Engenharia de Computação', period: '2º' },
    teacher: { teachings: [{ subject: 'Cálculo I', course: 'Engenharia de Computação' }, { subject: 'Cálculo I', course: 'Engenharia Elétrica' }] },
  })).json;
  assert.equal(saved.student.registration, '2026001'); assert.equal(saved.teacher.teachings.length, 2);
  assert.equal(saved.name, 'Aluno e professor fictício'); assert.equal(saved.phone, '+55 92 90000-0000');
  assert.equal('userId' in saved.student, false); assert.equal('password' in saved, false);
  assert.deepEqual((await request('/v1/me/profile', b)).json, beforeB);
  // Even a teacher of this student's classroom cannot inspect private academic/contact data.
  await request('/v1/users/demo-student-1/profile', main, 'GET', undefined, 404);
  await request('/v1/users/demo-student-1/profile', otherTeacher, 'GET', undefined, 404);
  await request('/v1/me/profile?userId=demo-student-1', main, 'GET', undefined, 400);
  assert.deepEqual(await db.membership.findMany({ where: { userId: 'demo-student-1' }, orderBy: { id: 'asc' } }), memberships);
  await request(`/v1/classrooms/${workshop}/missions`, a, 'POST', fixture, 404);
  const partial = (await request('/v1/me/profile', a, 'PATCH', { student: { period: null }, phone: null })).json;
  assert.equal(partial.student.period, null); assert.equal(partial.phone, null);
  assert.equal(partial.student.registration, '2026001'); assert.equal(partial.teacher.teachings.length, 2);
  assert.equal(partial.alternateEmail, 'contact@example.invalid');
  assert.equal((await request('/v1/me', a)).json.course, 'Engenharia de Computação');
  assert.equal((await db.account.findFirstOrThrow({ where: { userId: 'demo-student-1', providerId: 'credential' } })).password, hash);
  // Explicit replacement removes associations without affecting student/contact data.
  const removed = (await request('/v1/me/profile', a, 'PATCH', { teacher: { teachings: [] } })).json;
  assert.deepEqual(removed.teacher.teachings, []); assert.equal(removed.student.registration, '2026001');
});
test('perfil rejeita promoção, troca de dono, campos excluídos e disciplinas inválidas sem alteração parcial', async () => {
  const before = (await request('/v1/me/profile', a)).json;
  for (const input of [
    { userId: 'demo-student-2' }, { role: 'teacher' }, { email: 'other@example.invalid' }, { emailVerified: true },
    { name: ' ' }, { phone: 'x'.repeat(31) }, { alternateEmail: 'invalid' },
    { student: { shift: 'noturno' } }, { student: { coordination: 'Curso' } },
    { student: { registration: 'x'.repeat(51) } }, { teacher: { active: true, teachings: [] } },
    { teacher: { teachings: [{ subject: '', course: 'Curso' }] } },
    { teacher: { teachings: [{ subject: 'Cálculo', course: 'Curso' }, { subject: ' cálculo ', course: 'curso' }] } },
    { name: 'Não deve ser salvo', teacher: { teachings: Array.from({ length: 21 }, (_, i) => ({ subject: `Disciplina ${i}`, course: 'Curso' })) } },
  ]) await request('/v1/me/profile', a, 'PATCH', input, 400);
  await request('/v1/me/profile', a, 'PATCH', { phone: '999' }, 403, 'https://attacker.invalid');
  assert.deepEqual((await request('/v1/me/profile', a)).json, before);
});
test('rascunho privado, publicação com revisão explícita e versões imutáveis', async () => {
  const created = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  await request(`/v1/missions/${created.id}`, a, 'GET', undefined, 404);
  await request(`/v1/missions/${created.id}/publish`, main, 'POST', { versionId: created.draftVersion.id, reviewed: false }, 400);
  const published = (await request(`/v1/missions/${created.id}/publish`, main, 'POST', { versionId: created.draftVersion.id, reviewed: true })).json;
  assert.equal(published.status, 'published');
  await request(`/v1/missions/${created.id}/publish`, main, 'POST', { versionId: created.draftVersion.id, reviewed: true });
  await request(`/v1/missions/${created.id}`, main, 'PATCH', { ...fixture, title: 'Revisão privada', expectedDraftVersionId: null });
  const studentView = (await request(`/v1/missions/${created.id}`, a)).json;
  assert.equal(studentView.draftVersion, null); assert.equal(studentView.publishedVersion.title, fixture.title);
});
test('entregas: autoria, isolamento A/B, draft privado e controle de concorrência', async () => {
  const mission = (await request(`/v1/missions/${workshop}-mission`, a)).json;
  const input = { versionId: mission.publishedVersion.id, content: 'Rascunho aluno A', completedStepIds: [], currentStepId: mission.publishedVersion.steps[0].id, status: 'draft', expectedRevision: 0 };
  const own = (await request(`/v1/missions/${mission.id}/submissions`, a)).json.items[0];
  input.expectedRevision = own.revision;
  await request(`/v1/missions/${mission.id}/submissions`, a, 'POST', { ...input, ownerId: 'demo-student-2' }, 400);
  // Existing seed submissions 1 and 2 are submitted. Use a new published mission for a draft.
  const fresh = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  await request(`/v1/missions/${fresh.id}/publish`, main, 'POST', { versionId: fresh.draftVersion.id, reviewed: true });
  const savedInput = { ...input, versionId: fresh.draftVersion.id, currentStepId: fresh.draftVersion.steps[0].id, expectedRevision: 0 };
  const saved = (await request(`/v1/missions/${fresh.id}/submissions`, a, 'POST', savedInput)).json;
  await request(`/v1/submissions/${saved.id}`, b, 'GET', undefined, 404);
  await request(`/v1/submissions/${saved.id}`, main, 'GET', undefined, 404);
  await request(`/v1/submissions/${saved.id}`, otherTeacher, 'GET', undefined, 404);
  const results = await Promise.all(['Versão A', 'Versão B'].map(content => fetch(base + `/v1/missions/${fresh.id}/submissions`, { method: 'POST',
    headers: { cookie: a, origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...savedInput, content, expectedRevision: saved.revision }) })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const latest = (await request(`/v1/submissions/${saved.id}`, a)).json;
  const sent = (await request(`/v1/missions/${fresh.id}/submissions`, a, 'POST', { ...savedInput, content: latest.content, status: 'submitted', expectedRevision: latest.revision })).json;
  assert.equal(sent.status, 'submitted');
  await request(`/v1/submissions/${sent.id}/feedback`, b, 'POST', { content: 'Não autorizado' }, 404);
  const reviewed = (await request(`/v1/submissions/${sent.id}/feedback`, main, 'POST', { content: 'Compare também uma segunda alternativa.' })).json;
  assert.equal(reviewed.status, 'reviewed'); assert.equal(reviewed.feedback.length, 1);
});
test('convite opaco: papel fixo, consumo atômico, expiração e revogação', async () => {
  const outsider1 = await provision('new-student-1'); const outsider2 = await provision('new-student-2');
  const invite = (await request(`/v1/classrooms/${workshop}/invitations`, main, 'POST', {})).json;
  const stored = await db.invitation.findUniqueOrThrow({ where: { id: invite.id } }); assert.notEqual(stored.tokenHash, invite.token);
  const responses = await Promise.all([outsider1, outsider2].map(async u => {
    const r = await fetch(base + '/v1/invitations/accept', { method: 'POST', headers: { cookie: u.cookie, origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token: invite.token }) }); return r;
  }));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
  for (const r of responses) if (r.status === 200) assert.equal((await r.json() as any).role, 'student');
  const expired = (await request(`/v1/classrooms/${workshop}/invitations`, main, 'POST', {})).json;
  await db.invitation.update({ where: { id: expired.id }, data: { expiresAt: new Date(0) } });
  await request('/v1/invitations/accept', outsider1.cookie, 'POST', { token: expired.token }, 400);
  const revoked = (await request(`/v1/classrooms/${workshop}/invitations`, main, 'POST', {})).json;
  await request(`/v1/classrooms/${workshop}/invitations/${revoked.id}`, main, 'DELETE');
  await request('/v1/invitations/accept', outsider1.cookie, 'POST', { token: revoked.token }, 400);
});
test('barreiras só chegam ao professor com compartilhamento explícito', async () => {
  await request('/v1/barriers/demo-barrier-private', main, 'GET', undefined, 404);
  await request('/v1/barriers/demo-barrier-private', a);
  await request('/v1/barriers/demo-barrier-shared', b, 'GET', undefined, 404);
  const list = (await request(`/v1/classrooms/${workshop}/barriers`, main)).json.items;
  assert.ok(list.some((r: any) => r.id === 'demo-barrier-shared'));
  assert.ok(!list.some((r: any) => r.id === 'demo-barrier-private'));
  await request('/v1/barriers/demo-barrier-private/response', main, 'POST', { response: 'Resposta' }, 404);
  await request('/v1/barriers/demo-barrier-shared/response', main, 'POST', { response: 'Vou fornecer uma versão textual.' });
});
test('arquivo privado em quarentena e upload desabilitado', async () => {
  const material = await db.material.findFirstOrThrow({ where: { version: { mission: { classroomId: workshop } } } });
  await db.material.update({ where: { id: material.id }, data: { storagePath: 'quarantine/test.pdf', fileStatus: 'quarantined' } });
  await request(`/v1/materials/${material.id}/download`, a, 'GET', undefined, 404);
  await request(`/v1/materials/${material.id}/download`, otherTeacher, 'GET', undefined, 404);
  await request(`/v1/classrooms/${workshop}/uploads`, main, 'POST', {}, 503);
});
if (process.env.FRONTEND_PROXY_SOURCE) test('contrato com o proxy real do frontend: login, aluno, docente e publicação', { timeout: 30000 }, async () => {
  const { proxyBackend } = await import(pathToFileURL(process.env.FRONTEND_PROXY_SOURCE!).href);
  const settings = { internalUrl: base, publicOrigin: config.origin };
  async function proxy(group: 'auth' | 'v1', path: string[], cookie = '', method = 'GET', body?: unknown) {
    const response: Response = await proxyBackend(new Request(`${config.origin}/api/${group}/${path.join('/')}`, {
      method, headers: { origin: config.origin, cookie, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), group, path, settings);
    const json = await response.json(); assert.equal(response.status, 200, JSON.stringify(json));
    return { response, json };
  }
  const auth = await proxy('auth', ['sign-in', 'email'], '', 'POST', { email: process.env.DEMO_USER_EMAIL, password: process.env.DEMO_USER_PASSWORD });
  const cookies = auth.response.headers.getSetCookie(); assert.ok(cookies.length); assert.ok(cookies.every(c => !/;\s*domain=/i.test(c)));
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  assert.equal((await proxy('v1', ['me'], cookie)).json.id, mainId);
  const contexts = (await proxy('v1', ['classrooms'], cookie)).json.items;
  assert.equal(contexts.length, 4);
  const library = (await proxy('v1', ['missions', 'demo-class-programacao-mission'], cookie)).json;
  const own = (await proxy('v1', ['missions', library.id, 'submissions'], cookie)).json.items[0];
  await proxy('v1', ['missions', library.id, 'submissions'], cookie, 'POST', { versionId: library.publishedVersion.id,
    content: 'Atividade preservada pelo proxy real.', completedStepIds: own.completedStepIds, currentStepId: own.currentStepId,
    status: 'draft', expectedRevision: own.revision });
  const reviewed = (await proxy('v1', ['missions', 'demo-class-estatistica-mission', 'submissions'], cookie)).json.items[0];
  assert.equal(reviewed.feedback.length, 1);
  assert.equal((await proxy('v1', ['classrooms', workshop, 'members'], cookie)).json.items.filter((m: any) => m.role === 'student').length >= 8, true);
  const created = (await proxy('v1', ['classrooms', workshop, 'missions'], cookie, 'POST', fixture)).json;
  const published = (await proxy('v1', ['missions', created.id, 'publish'], cookie, 'POST', { versionId: created.draftVersion.id, reviewed: true })).json;
  assert.equal(published.status, 'published');
  await proxy('auth', ['sign-out'], cookie, 'POST', {});
});
test('IA indisponível clara; cota concorrente, deduplicação e revisão humana', { timeout: 30000 }, async () => {
  let mission = (await request(`/v1/missions/${workshop}-draft`, main)).json;
  const input = { materialIds: [mission.draftVersion.materials[0].id], objectives: ['Comparar soluções.'], approvedForProvider: true, idempotencyKey: randomUUID() };
  await request(`/v1/missions/${mission.id}/ai-drafts`, main, 'POST', input, 503);
  config.aiEnabled = true; config.model = 'fake-test-only'; hold = true;
  const generating = request(`/v1/missions/${mission.id}/ai-drafts`, main, 'POST', input);
  while (!release) await new Promise(resolve => setTimeout(resolve, 10));
  await request(`/v1/missions/${mission.id}/ai-drafts`, main, 'POST', { ...input, idempotencyKey: randomUUID() }, 429);
  release(); hold = false;
  const generated = (await generating).json;
  assert.equal(generated.status, 'succeeded'); assert.equal(providerCalls, 1);
  assert.ok(!providerInput.includes('example.invalid') && !providerInput.includes('Joao Felipe') && !providerInput.includes('Relato'));
  await request(`/v1/ai-generations/${generated.id}`, a, 'GET', undefined, 404);
  mission = (await request(`/v1/missions/${mission.id}`, main)).json;
  assert.equal(mission.status, 'draft'); assert.equal(mission.publishedVersion, null); assert.equal(mission.draftVersion.source, 'gemini');
  const replay = (await request(`/v1/missions/${mission.id}/ai-drafts`, main, 'POST', input)).json;
  assert.equal(replay.id, generated.id); assert.equal(providerCalls, 1);
  await db.membership.update({ where: { userId_classroomId: { userId: mainId, classroomId: workshop } }, data: { active: false } });
  await request(`/v1/ai-generations/${generated.id}`, main, 'GET', undefined, 404);
  await db.membership.update({ where: { userId_classroomId: { userId: mainId, classroomId: workshop } }, data: { active: true } });
  invalidOutput = true;
  await request(`/v1/missions/${mission.id}/ai-drafts`, main, 'POST', { ...input, materialIds: [mission.draftVersion.materials[0].id], idempotencyKey: randomUUID() }, 502);
  const unchanged = (await request(`/v1/missions/${mission.id}`, main)).json;
  assert.equal(unchanged.draftVersion.id, mission.draftVersion.id);
  config.aiEnabled = false;
});
test('limite de login persiste após recriar a aplicação e demo exige isolamento', { timeout: 30000 }, async () => {
  assert.throws(() => readConfig({ ...process.env, DEMO_ONLY: 'false' }));
  assert.equal(createAuth(db, { ...config, demo: false }).options.emailAndPassword?.minPasswordLength, 12);
  assert.equal(createAuth(db, config).options.emailAndPassword?.minPasswordLength, 5);
  await db.rateBucket.deleteMany();
  for (let i = 0; i < 20; i++) await request('/api/auth/sign-in/email', '', 'POST', { email: 'absent@example.invalid', password: testPassword }, 401);
  await request('/api/auth/sign-in/email', '', 'POST', { email: 'absent@example.invalid', password: testPassword }, 429);
  await runtime.app.close();
  runtime = await createApplication(db, config);
  await runtime.app.listen(0, '127.0.0.1'); base = await runtime.app.getUrl();
  await request('/api/auth/sign-in/email', '', 'POST', { email: 'absent@example.invalid', password: testPassword }, 429);
});
test('vínculo revogado impede novas leituras e sessão revogada/expirada não autentica', async () => {
  const member = await db.membership.findUniqueOrThrow({ where: { userId_classroomId: { userId: 'demo-student-2', classroomId: workshop } } });
  await request(`/v1/classrooms/${workshop}/members/${member.id}`, main, 'DELETE');
  await request(`/v1/missions/${workshop}-mission`, b, 'GET', undefined, 404);
  await request('/v1/barriers/demo-barrier-shared', b, 'GET', undefined, 404);
  await request('/api/auth/sign-out', a, 'POST', {});
  await request('/v1/me', a, 'GET', undefined, 401);
  await db.session.updateMany({ where: { userId: mainId }, data: { expiresAt: new Date(0) } });
  await request('/v1/me', main, 'GET', undefined, 401);
});
