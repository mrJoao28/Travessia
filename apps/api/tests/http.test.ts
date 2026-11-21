Warning: truncated output (original token count: 26181)
Total output lines: 1144

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { MaterialWorker, materialNarration } from '../src/material-worker.js';
import { materialPath } from '../src/material-files.js';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { createApplication } from '../src/runtime.js';
import { verifySupportAudio } from '../src/support-audio.js';
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
  await db.studentProfile.update({ where: { userId: mainId }, data: { period: '2º período preservado' } });
  const academicBefore = await db.user.findUniqueOrThrow({ where: { id: mainId }, select: {
    studentProfile: true, teacherProfile: { include: { teachings: true } },
  } });
  await seedDemo(db, config);
  assert.deepEqual(await db.user.findUniqueOrThrow({ where: { id: mainId }, select: {
    studentProfile: true, teacherProfile: { include: { teachings: true } },
  } }), academicBefore);
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

test('health público, sessão inválida, CSRF e cadastro na plataforma', async () => {
  await request('/v1/health');
  await request('/v1/me', '', 'GET', undefined, 401);
  await request('/v1/me', 'better-auth.session_token=forged', 'GET', undefined, 401);
  await request('/api/auth/sign-up/email', '', 'POST', {}, 400);
  await request('/api/auth/sign-up/email', '', 'POST', { name: 'Ana', email: 'ana-curta@example.invalid', password: 'Abcd123' }, 400);
  await request('/api/auth/sign-up/email', '', 'POST', { name: 'Ana', email: 'csrf@example.invalid', password: testPassword }, 403, 'https://attacker.invalid');
  await request('/api/auth/sign-up/email', '', 'POST', { name: '  ', email: 'sem-nome@example.invalid', password: testPassword }, 400);
  await request('/api/auth/sign-up/email', '', 'POST', { name: 'A'.repeat(81), email: 'nome-longo@example.invalid', password: testPassword }, 400);
  const email = `ana-${randomUUID()}@example.invalid`;
  const password = 'Abcd1234';
  const created = await request('/api/auth/sign-up/email', '', 'POST', { name: '  Ana Costa  ', email, password, role: 'teacher' });
  const cookies = created.response.headers.getSetCookie();
  assert.ok(cookies.some(c => /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)));
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  const me = (await request('/v1/me', cookie)).json;
  assert.equal(me.name, 'Ana Costa');
  assert.equal(me.email, email);
  assert.equal((await request('/v1/classrooms', cookie)).json.items.length, 0);
  await request(`/v1/classrooms/${workshop}/members`, cookie, 'GET', undefined, 404);
  await request(`/v1/classrooms/${workshop}/invitations`, cookie, 'POST', {}, 404);
  const stored = await db.user.findUniqueOrThrow({ where: { email }, include: { accounts: true } });
  assert.ok(stored.accounts.some(account => account.password && account.password !== password));
  await request('/api/auth/sign-up/email', '', 'POST', { name: 'Ana Costa', email, password }, 422);
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
  const canonical = (await request(`/v1/activities/${created.id}`, main)).json;
  const legacy = (await request(`/v1/missions/${created.id}`, main)).json;
  assert.equal(canonical.id, created.id); assert.equal(legacy.id, created.id);
  assert.equal(canonical.draftVersion.title, fixture.title);
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
test('atividade em grupo: equipe exclusiva, rascunho compartilhado e entrega única', async () => {
  const c = (await provision('demo-student-3')).cookie;
  const created = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', { ...fixture, workMode: 'group' })).json;
  const path = `/v1/missions/${created.id}`;
  assert.equal(created.draftVersion.workMode, 'group');
  await request(`${path}/groups`, a, 'GET', undefined, 404);
  await request(`${path}/groups`, a, 'POST', { name: 'Invasora', studentIds: ['demo-student-1', 'demo-student-2'] }, 404);
  await request(`${path}/groups`, main, 'POST', { name: 'Inválida', studentIds: ['demo-student-1', mainId] }, 400);
  const team = (await request(`${path}/groups`, main, 'POST', { name: 'Equipe A', studentIds: ['demo-student-1', 'demo-student-2'] })).json;
  await request(`${path}/groups`, main, 'POST', { name: 'Equipe B', studentIds: ['demo-student-2', 'demo-student-3'] }, 409);
  await request(`${path}/publish`, main, 'POST', { versionId: created.draftVersion.id, reviewed: true });
  assert.deepEqual((await request(`${path}/groups`, a)).json.items.map((g: any) => g.id), [team.id]);
  assert.deepEqual((await request(`${path}/groups`, c)).json.items, []);
  const input = { versionId: created.draftVersion.id, content: 'Texto coletivo', completedStepIds: [], currentStepId: created.draftVersion.steps[0].id, status: 'draft', expectedRevision: 0 };
  await request(`${path}/submissions`, c, 'POST', input, 409);
  const first = (await request(`${path}/submissions`, a, 'POST', input)).json;
  assert.equal(first.groupId, team.id);
  assert.equal((await request(`${path}/submissions`, b)).json.items[0].id, first.id);
  assert.equal((await request(`/v1/submissions/${first.id}`, b)).json.content, 'Texto coletivo');
  await request(`/v1/submissions/${first.id}`, c, 'GET', undefined, 404);
  await request(`/v1/submissions/${first.id}`, main, 'GET', undefined, 404);
  await request(`${path}/groups/${team.id}`, main, 'DELETE', undefined, 409);
  const submitted = (await request(`${path}/submissions`, b, 'POST', { ...input, content: 'Resposta conjunta', status: 'submitted', expectedRevision: first.revision })).json;
  assert.equal(submitted.id, first.id);
  assert.equal(submitted.userId, 'demo-student-1');
  assert.equal((await request(`${path}/submissions`, main)).json.items.length, 1);
  await request(`${path}/submissions`, a, 'POST', { ...input, expectedRevision: submitted.revision }, 409);
});
test('feedback com ajustes abre nova tentativa e preserva a entrega revisada', async () => {
  const mission = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  const versionId = mission.draftVersion.id;
  const path = `/v1/missions/${mission.id}/submissions`;
  await request(`/v1/missions/${mission.id}/publish`, main, 'POST', { versionId, reviewed: true });
  const input = { versionId, currentStepId: mission.draftVersion.steps[0].id, completedStepIds: [], content: 'Primeira tentativa', status: 'submitted', expectedRevision: 0 };
  const first = (await request(path, a, 'POST', input)).json;
  await request(path, a, 'POST', { ...input, expectedRevision: first.revision }, 409);
  const reviewed = (await request(`/v1/submissions/${first.id}/feedback`, main, 'POST', { content: 'Compare mais uma hipótese.', requestRevision: true })).json;
  assert.equal(reviewed.revisionRequested, true);
  const next = (await request(path, a, 'POST', { ...input, content: 'Segunda tentativa', status: 'draft', expectedRevision: reviewed.revision })).json;
  assert.equal(next.attempt, 2);
  assert.notEqual(next.id, first.id);
  await request(`/v1/submissions/${next.id}`, main, 'GET', undefined, 404);
  const prior = (await request(`/v1/submissions/${first.id}`, a)).json;
  assert.equal(prior.content, input.content);
  assert.equal(prior.feedback[0].content, 'Compare mais uma hipótese.');
});
test('prazo e nota por etapa: professor confirma pontos e total calculado para o aluno', async () => {
  const dueAt = '2000-04-21T15:00:00.000Z';
  const input = { ...fixture, steps: [
    { ...fixture.steps[0], dueAt, maxPoints: 4 },
    { title: 'Justificar', instructions: 'Justifique sua escolha.', example: 'Liste seus motivos.', dueAt: null, maxPoints: 6 },
  ] };
  const mission = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', input)).json;
  const path = `/v1/missions/${mission.id}`;
  await request(`${path}/publish`, main, 'POST', { versionId: mission.draftVersion.id, reviewed: true });
  const version = (await request(path, a)).json.publishedVersion;
  assert.equal(version.steps[0].dueAt, dueAt);
  assert.equal(version.steps[0].deadlineExtended, false);
  assert.deepEqual(version.steps.map((step: { maxPoints: number }) => step.maxPoints), [4, 6]);
  const extendedUntil = '2099-04-22T15:00:00.000Z';
  await request(`/v1/activities/${mission.id}/steps/${version.steps[0].id}/deadline-extension`, main, 'PATCH', { studentId: 'demo-student-1', dueAt: dueAt }, 400);
  const extension = (await request(`/v1/activities/${mission.id}/steps/${version.steps[0].id}/deadline-extension`, main, 'PATCH', { studentId: 'demo-student-1', dueAt: extendedUntil })).json;
  assert.equal(extension.dueAt, extendedUntil);
  const studentVersion = (await request(path, a)).json.publishedVersion;
  const otherStudentVersion = (await request(path, b)).json.publishedVersion;
  assert.equal(studentVersion.steps[0].dueAt, extendedUntil); assert.equal(studentVersion.steps[0].deadlineExtended, true);
  assert.equal(otherStudentVersion.steps[0].dueAt, dueAt); assert.equal(otherStudentVersion.steps[0].deadlineExtended, false);
  await request(`/v1/activities/${mission.id}/steps/${version.steps[0].id}/deadline-extension`, a, 'PATCH', { studentId: 'demo-student-1', dueAt: extendedUntil }, 404);
  const sent = (await request(`${path}/submissions`, a, 'POST', { versionId: version.id,
    currentStepId: version.steps[0].id, completedStepIds: version.steps.map((step: { id: string }) => step.id),
    content: 'Minha justificativa.', status: 'submitted', expectedRevision: 0 })).json;
  const records = (await request(`/v1/submissions/${sent.id}`, main)).json.gradingSteps;
  assert.equal(records[0].deadlineExtended, true); assert.equal(records[0].late, false); assert.ok(records[0].completedAt);
  const draftAfterDeadline = (await request(`${path}/submissions`, b, 'POST', { versionId: version.id,
    currentStepId: version.steps[1].id, completedStepIds: [], content: 'Rascunho após o prazo.'…14181 tokens truncated…n, 'POST', input)).json.id, plan.id);
  await worker.tick(); assert.equal(calls,0,'Formatação e voz não chamam a IA');
  let draft = (await request(`${path}/material-adaptations?versionId=${versionId}`, main)).json.items[0];
  assert.equal(draft.status,'draft');
  await request(`${path}/material-adaptations/${plan.id}/release`,main,'POST',{expectedRevision:1,reviewed:true},409);
  const missionPdf = (await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items;
  assert.equal(missionPdf.length,1);assert.equal(missionPdf[0].id,source.id);assert.equal(missionPdf[0].status,'ready');
  assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,b)).json.items[0].id,source.id);
  const malicious = [{page:1,title:'Teste',text:'<script>alert(1)</script> Dados: 10 metros.',description:'Diagrama.'}];
  draft=(await request(`${path}/material-adaptations/${plan.id}`,main,'PATCH',{expectedRevision:1,document:malicious})).json;
  await request(`${path}/material-adaptations/${plan.id}`,main,'PATCH',{expectedRevision:1,document:malicious},409);
  await request(`${path}/material-adaptations/${plan.id}/render`,main,'POST',{expectedRevision:draft.revision});
  await worker.tick();
  let rendered = (await request(`${path}/material-adaptations?versionId=${versionId}`,main)).json.items[0]; assert.equal(rendered.status,'ready');assert.equal(rendered.hasAudio,true);
  await request(`${path}/material-adaptations/${plan.id}/release`,main,'POST',{expectedRevision:rendered.revision},400);
  await request(`${path}/material-adaptations/${plan.id}/release`,main,'POST',{expectedRevision:rendered.revision,reviewed:true});
  const student = (await request(`${path}/my-materials?versionId=${versionId}`,a)).json; assert.equal(student.items.length,2);assert.ok(!JSON.stringify(student).includes('studentId'));
  assert.equal(student.items.find((item: {id:string})=>item.id===plan.id).scope,'individual');
  assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,b)).json.items.length,1);
  async function file(kind:string, cookie:string,status=200) { const r=await fetch(`${base}${path}/material-assets/${plan.id}/${kind}`,{headers:{cookie}});assert.equal(r.status,status);return r; }
  await file('pdf',a,404);
  await file('audio',a);await file('page-1',a);await file('page-2',a,404);await file('pdf',b,404);await file('audio',otherTeacher,404);
  await request(`${path}/material-assets/${source.id}/original`,a,'GET',undefined,404);
  await db.membership.update({where:{userId_classroomId:{userId:'demo-student-1',classroomId:workshop}},data:{active:false}});await file('pdf',a,404);
  await db.membership.update({where:{userId_classroomId:{userId:'demo-student-1',classroomId:workshop}},data:{active:true}});
  const replacement = [{ ...malicious[0], text: 'Versão nova para revisar.' }];
  const pendingRevision = (await request(`${path}/material-adaptations/${plan.id}`,main,'PATCH',{
    expectedRevision:rendered.revision,document:replacement,
  })).json;
  assert.equal(pendingRevision.hasReleasedVersion, true);
  await file('pdf',a,404); await file('audio',a); await file('pdf',b,404);
  const deliveredText = async () => (await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items.find((item:{id:string})=>item.id===plan.id).document[0].text;
  assert.equal(await deliveredText(), malicious[0].text);
  await request(`${path}/material-adaptations/${plan.id}/render`,main,'POST',{expectedRevision:pendingRevision.revision});
  await worker.tick();
  assert.equal(await deliveredText(), malicious[0].text);
  await request(`${path}/material-adaptations/${plan.id}/release`,main,'POST',{expectedRevision:pendingRevision.revision,reviewed:true});
  assert.equal(await deliveredText(), replacement[0].text);
  await file('pdf',a,404);
  config.aiEnabled=true;
  const aiInput={...input,settings:{...settings,supports:['image-description'],useAi:true,approvedForProvider:true},requestKey:randomUUID()};
  const aiPlan=(await request(`${path}/material-adaptations`,main,'POST',aiInput)).json;
  await worker.tick();assert.equal(calls,1);assert.ok(sent.includes('image'));assert.ok(!sent.includes('demo-student-1')&&!sent.includes('example.invalid')&&!sent.includes('blindness'));
  const cached=(await request(`${path}/material-adaptations`,main,'POST',{...aiInput,requestKey:randomUUID()})).json;assert.equal(cached.id,aiPlan.id);assert.equal(calls,1);
  await request(`${path}/material-adaptations/${aiPlan.id}/render`, main, 'POST', { expectedRevision: cached.revision });
  await worker.tick();
  assert.equal((await db.materialAdaptation.findUniqueOrThrow({ where: { id: aiPlan.id } })).hasAudio, true);
  assert.match(audioScript, /Diagrama compara duas alternativas/);
  assert.doesNotMatch(audioScript, /Dados: 10 metros/);
  assert.equal(calls, 1, 'A voz local não gera outra chamada de IA');
  const next=(await request(`${path}/material-adaptations`,main,'POST',{...aiInput,studentId:'demo-student-2',requestKey:randomUUID()})).json;
  await db.membership.update({where:{userId_classroomId:{userId:mainId,classroomId:workshop}},data:{active:false}});await worker.tick();assert.equal(calls,1);
  assert.equal((await db.materialAdaptation.findUniqueOrThrow({where:{id:next.id}})).status,'failed');
  await db.membership.update({where:{userId_classroomId:{userId:mainId,classroomId:workshop}},data:{active:true}});
  const longPages = Array.from({ length: 9 }, (_, index) => ({
    page: index + 1, text: 'Dados: 10 metros. Compare alternativas.', hasVisual: false, ocr: false,
  }));
  await db.materialSource.update({ where: { id: source.id }, data: { pages: longPages, pageCount: longPages.length } });
  const callsBeforeBatches = calls;
  const structured = (await request(`${path}/material-adaptations`, main, 'POST', {
    ...input, pages: longPages.map(p => p.page), autoRender: true, requestKey: randomUUID(),
    settings: { supports: ['short-sections', 'glossary', 'high-contrast', 'large-print', 'wide-spacing', 'narration'],
      fontSize: '18', color: 'default', useAi: true, approvedForProvider: true },
  })).json;
  assert.equal(structured.settings.color, 'high');
  assert.equal(structured.settings.fontSize, '22');
  await worker.tick();
  assert.equal(calls - callsBeforeBatches, 3);
  await worker.tick();
  const structuredDraft = (await request(`${path}/material-adaptations?versionId=${versionId}`, main)).json.items.find((item: {id: string}) => item.id === structured.id);
  assert.equal(structuredDraft.status, 'ready');
  assert.equal(structuredDraft.inputTokens, 3 * 123);
  assert.deepEqual(structuredDraft.document.map((p: {page: number}) => p.page), longPages.map(p => p.page));
  assert.deepEqual(structuredDraft.document[0], {
    page: 1, title: 'Página 1', text: 'Dados: 10 metros. Compare alternativas.', description: '',
    steps: ['Compare as alternativas.'], glossary: [{ term: 'Alternativa', definition: 'Uma opção entre as disponíveis.' }],
  });
  const structuredPath = `${path}/material-adaptations/${structured.id}`;
  const edited = (await request(structuredPath, main, 'PATCH', { expectedRevision: structuredDraft.revision, document: [{
    ...structuredDraft.document[0], steps: ['Compare <A> e <B>.'],
  }, ...structuredDraft.document.slice(1)] })).json;
  await request(`${structuredPath}/render`, main, 'POST', { expectedRevision: edited.revision });
  await worker.tick();
  assert.match(renderedHtml, /font-size:22pt;line-height:1.8;color:#000;background:#fff/);
  assert.match(renderedHtml, /<ol><li>Compare &lt;A&gt; e &lt;B&gt;\.<\/li><\/ol>/);
  assert.match(renderedHtml, /<dl><div><dt>Alternativa<\/dt><dd>Uma opção entre as disponíveis\.<\/dd><\/div><\/dl>/);
  assert.match(audioScript, /Passos da atividade\.\s+1\. Compare <A> e <B>\./);
  assert.match(audioScript, /Glossário\.\s+Alternativa: Uma opção entre as disponíveis\./);
  await request(`${structuredPath}/release`, main, 'POST', { expectedRevision: edited.revision, reviewed: true });
  const delivered = (await request(`${path}/my-materials?versionId=${versionId}`, a)).json.items.find((item: {id: string}) => item.id === structured.id);
  assert.deepEqual(delivered.document, edited.document);
  assert.deepEqual(delivered.reading, { supports: structured.settings.supports, fontSize: '22', color: 'high' });
  await request(structuredPath, main, 'DELETE');
  config.aiEnabled=false;
  await db.materialAdaptation.createMany({data:Array.from({length:41},()=>({versionId,sourceId:source.id,studentId:'demo-student-1',creatorId:mainId,requestKey:randomUUID(),requestHash:randomUUID(),settings,pages:[1],document:malicious,status:'released',expiresAt:new Date(Date.now()+86400000)}))});
  assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items.length,43,'O PDF da missão e os materiais liberados continuam disponíveis além do quadragésimo item');
  await request(`${path}/material-sources/${source.id}`,main,'DELETE');await file('pdf',a,404);await worker.collect();
  assert.equal(await db.materialSource.count({where:{id:source.id}}),0);
});
test('PDF original individual: revisão, isolamento A/B, quarentena, revogação, versão e retirada',async()=>{
 const created=(await request(`/v1/classrooms/${workshop}/missions`,main,'POST',fixture)).json;
 const versionId=created.draftVersion.id,path=`/v1/missions/${created.id}`;
 const bytes=Buffer.from('%PDF-1.4\noriginal privado completo');
 const source=(await request(`${path}/material-sources`,main,'POST',{versionId,title:'Original',downloadAllowed:false,base64:bytes.toString('base64'),requestKey:randomUUID()})).json;
 await db.materialSource.update({where:{id:source.id},data:{pages:[{page:1,text:'Texto do documento original.',hasVisual:true,ocr:false}]}});
 await writeFile(materialPath(source.id,'page-1.png'),'visual fixture');
 const input={versionId,sourceId:source.id,studentId:'demo-student-1',requestKey:randomUUID(),reviewed:true};
 await request(`${path}/original-materials`,a,'POST',input,404);
 await request(`${path}/original-materials`,otherTeacher,'POST',input,404);
 await request(`${path}/original-materials`,main,'POST',input,404);
 await db.materialSource.update({where:{id:source.id},data:{status:'ready'}});
 await request(`${path}/original-materials`,main,'POST',{...input,reviewed:false},400);
 await request(`${path}/original-materials`,main,'POST',{...input,studentId:mainId},400);
 const before=providerCalls,original=(await request(`${path}/original-materials`,main,'POST',input)).json;
 assert.equal(original.mode,'original');assert.equal(original.status,'released');assert.deepEqual(original.document,[]);assert.deepEqual(original.settings.supports,[]);
 assert.equal((await request(`${path}/original-materials`,main,'POST',input)).json.id,original.id);
 await request(`${path}/original-materials`,main,'POST',{...input,studentId:'demo-student-2'},409);
 assert.equal((await request(`${path}/original-materials`,main,'POST',{...input,requestKey:randomUUID()})).json.id,original.id);
 async function file(cookie:string,status=200,kind='pdf'){const r=await fetch(`${base}${path}/material-assets/${original.id}/${kind}`,{headers:{cookie}});assert.equal(r.status,status);return r;}
 await file(a,404);await request(`${path}/publish`,main,'POST',{versionId,reviewed:true});
 await file(a,404);
 const delivered=(await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items[0];assert.equal(delivered.mode,'original');assert.deepEqual(delivered.previewPages,[1]);
 const page=await file(a,200,'page-1');assert.equal(page.headers.get('content-type'),'image/png');
 assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,b)).json.items.length,1);
 await file(b,404);await file(otherTeacher,404);await file(a,404,'audio');await file(a,200,'page-1');
 await request(`${path}/material-assets/${source.id}/original`,a,'GET',undefined,404);
 await request(`${path}/material-adaptations/${original.id}/render`,main,'POST',{expectedRevision:1},409);
 await request(`${path}/material-adaptations/${original.id}`,main,'PATCH',{expectedRevision:1,document:[{page:1,title:'Outro',text:'Texto.',description:''}]},409);
 await db.membership.update({where:{userId_classroomId:{userId:'demo-student-1',classroomId:workshop}},data:{active:false}});await file(a,404);
 await db.membership.update({where:{userId_classroomId:{userId:'demo-student-1',classroomId:workshop}},data:{active:true}});
 await request(`${path}/material-adaptations/${original.id}`,main,'DELETE');await file(a,404);
 const renewed=(await request(`${path}/original-materials`,main,'POST',{...input,requestKey:randomUUID()})).json;
 await db.materialSource.update({where:{id:source.id},data:{expiresAt:new Date(0)}});
 const expired=await fetch(`${base}${path}/material-assets/${renewed.id}/pdf`,{headers:{cookie:a}});assert.equal(expired.status,404);
 await db.materialSource.update({where:{id:source.id},data:{expiresAt:new Date(Date.now()+86400000)}});
 const next=(await request(path,main,'PATCH',{...fixture,title:'Nova versão sem herdar arquivos',expectedDraftVersionId:null})).json;
 await request(`${path}/publish`,main,'POST',{versionId:next.draftVersion.id,reviewed:true});
 const previous=await fetch(`${base}${path}/material-assets/${renewed.id}/pdf`,{headers:{cookie:a}});assert.equal(previous.status,404);
 assert.equal((await request(`${path}/my-materials?versionId=${next.draftVersion.id}`,a)).json.items.length,0);
 assert.equal(providerCalls,before,'Disponibilizar original não chama IA');
 assert.equal(await db.materialAdaptation.count({where:{sourceId:source.id,status:{in:['queued','generating','rendering']}}}),0);
});
test('PDF adaptado para toda a turma: revisão, publicação e acesso apenas aos alunos ativos',async()=>{
 const mission=(await request(`/v1/classrooms/${workshop}/missions`,main,'POST',fixture)).json;
 const versionId=mission.draftVersion.id,path=`/v1/missions/${mission.id}`;
 const source=(await request(`${path}/material-sources`,main,'POST',{versionId,title:'Arquivo compartilhado',downloadAllowed:false,base64:Buffer.from('%PDF-1.4\nconteudo comum').toString('base64'),requestKey:randomUUID()})).json;
 await db.materialSource.update({where:{id:source.id},data:{status:'ready',pageCount:1,pages:[{page:1,text:'Texto de referência.',hasVisual:false,ocr:false}]}});
 await writeFile(materialPath(source.id,'page-1.png'),'visual fixture');
 const input={versionId,sourceId:source.id,audience:'classroom',pages:[1],settings:{supports:['large-print'],fontSize:'22',color:'default',useAi:false,approvedForProvider:false},requestKey:randomUUID()};
 await request(`${path}/material-adaptations`,main,'POST',{...input,studentId:'demo-student-1'},400);
 await request(`${path}/material-adaptations`,main,'POST',{...input,audience:'student'},400);
 const queued=(await request(`${path}/material-adaptations`,main,'POST',input)).json;
 assert.equal(queued.studentId,null);assert.equal(queued.audience,'classroom');
 assert.equal((await request(`${path}/material-adaptations`,main,'POST',input)).json.id,queued.id);
 const worker=new MaterialWorker(db,config,async()=>{throw new Error('IA não solicitada');},async()=>{throw new Error('Extração não solicitada');},async filename=>{await writeFile(filename,'%PDF-adaptado');});
 await worker.tick();
 const draft=(await request(`${path}/material-adaptations?versionId=${versionId}`,main)).json.items.find((item:{id:string})=>item.id===queued.id);
 assert.equal(draft.status,'draft');
 await request(`${path}/material-adaptations/${queued.id}/render`,main,'POST',{expectedRevision:draft.revision});
 await worker.tick();
 await request(`${path}/material-adaptations/${queued.id}/release`,main,'POST',{expectedRevision:draft.revision,reviewed:true});
 await request(`${path}/material-assets/${queued.id}/pdf`,a,'GET',undefined,404);
 await request(`${path}/publish`,main,'POST',{versionId,reviewed:true});
 for(const cookie of [a,b]){
  const items=(await request(`${path}/my-materials?versionId=${versionId}`,cookie)).json.items;
  assert.deepEqual(items.map((item:{mode:string})=>item.mode),['original','adapted']);
  const asset=await fetch(`${base}${path}/material-assets/${queued.id}/pdf`,{headers:{cookie}});
  assert.equal(asset.status,404,'o PDF adaptado também não pode ser baixado pelo visualizador');
  const page=await fetch(`${base}${path}/material-assets/${queued.id}/page-1`,{headers:{cookie}});
  assert.equal(page.status,200);assert.equal(page.headers.get('content-type'),'image/png');
 }
 await request(`${path}/material-assets/${queued.id}/pdf`,otherTeacher,'GET',undefined,404);
 await db.membership.update({where:{userId_classroomId:{userId:'demo-student-2',classroomId:workshop}},data:{active:false}});
 await request(`${path}/material-assets/${queued.id}/pdf`,b,'GET',undefined,404);
 await db.membership.update({where:{userId_classroomId:{userId:'demo-student-2',classroomId:workshop}},data:{active:true}});
 await request(`${path}/material-adaptations/${queued.id}`,main,'DELETE');
 assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items.length,1);
});
test('narração integral: quatro páginas preservadas, descrição IA separada e voz exclusivamente local', { timeout: 30000 }, async () => {
  const mission = (await request(`/v1/classrooms/${workshop}/missions`,main,'POST',fixture)).json;
  const versionId=mission.draftVersion.id, path=`/v1/missions/${mission.id}`;
  await request(`${path}/publish`,main,'POST',{versionId,reviewed:true});
  const source=(await request(`${path}/material-sources`,main,'POST',{versionId,title:'Quatro páginas fictícias',downloadAllowed:false,base64:Buffer.from('%PDF-1.4\nfixture').toString('base64'),requestKey:randomUUID()})).json;
  const pages=[1,2,3,4].map(page=>({page,text:`Texto integral da página ${page}. Valor: ${page*10} metros. Última frase ${page}.`,hasVisual:true,ocr:false}));
  let aiCalls=0, audioCalls=0, spoken='', failRegeneration=false;
  const worker=new MaterialWorker(db,config,async input=>{
    aiCalls++; assert.equal(input.descriptionsOnly,true);
    assert.deepEqual(input.pages.map(p=>p.text),(aiCalls === 1 ? pages : [pages[1]]).map(p=>p.text));
    if (failRegeneration) throw Object.assign(new Error('provider payload must stay private'), { status: 429 });
    return {document:input.pages.map(p=>({page:p.page,title:'Título inventado',text:'Resumo que deve ser ignorado.',description:`Descrição visual da página ${p.page}.${aiCalls > 1 ? " Revisada." : ""}`}))};
  },async(mode,filename,input)=>{
    if(mode==='extract') {for(const p of pages)await writeFile(materialPath(source.id,`page-${p.page}.png`),'visual fixture');return {pages,warnings:[]};}
    audioCalls++; spoken=input??''; await writeFile(filename,'audio fixture');return {};
  },async(filename)=>{await writeFile(filename,'%PDF-fixture');});
  await worker.tick(); config.aiEnabled=true;
  try {
    const plan=(await request(`${path}/material-adaptations`,main,'POST',{versionId,sourceId:source.id,studentId:'demo-student-1',pages:[1,2,3,4],settings:{supports:['image-description','narration'],fontSize:'18',color:'default',useAi:true,approvedForProvider:true},requestKey:randomUUID()})).json;
    await worker.tick(); assert.equal(aiCalls,1);
    const readDraft = async () => (await request(`${path}/material-adaptations?versionId=${versionId}`,main)).json.items.find((p:{id:string})=>p.id===plan.id);
    const original = await readDraft();
    const adaptationPath = `${path}/material-adaptations/${plan.id}`;
    const edit = { expectedRevision: original.revision, document: original.document, regeneratePage: 2, approvedForProvider: true };
    await request(adaptationPath, main, 'PATCH', { ...edit, approvedForProvider: undefined }, 400);
    await request(adaptationPath, main, 'PATCH', edit);
    await request(adaptationPath, main, 'PATCH', edit, 409);
    await worker.tick();
    const regenerated = await readDraft();
    assert.equal(aiCalls, 2);
    assert.deepEqual(regenerated.document.filter((p:{page:number})=>p.page!==2), original.document.filter((p:{page:number})=>p.page!==2));
    assert.equal(regenerated.document[1].description, 'Descrição visual da página 2. Revisada.');
    failRegeneration = true;
    await request(adaptationPath, main, 'PATCH', { ...edit, expectedRevision: regenerated.revision, document: regenerated.document });
    await worker.tick();
    const draft = await readDraft();
    assert.equal(draft.status, 'draft');
    assert.match(draft.error, /limite de uso/);
    assert.ok(!draft.error.includes('provider payload'));
    assert.deepEqual(draft.document, regenerated.document);
    assert.deepEqual(draft.document.map((p:{text:string})=>p.text),pages.map(p=>p.text));
    await request(`${path}/material-adaptations/${plan.id}/render`,main,'POST',{expectedRevision:draft.revision});
    await worker.tick();assert.equal(audioCalls,1);assert.equal(aiCalls,3,'Gerar voz não chama Gemini novamente');
    assert.equal(spoken,materialNarration(draft.document));
    for(const p of pages){assert.ok(spoken.includes(p.text));assert.ok(spoken.includes(`Descrição visual da página ${p.page}.`));assert.ok(spoken.includes(`Fim da página ${p.page}.`));}
    assert.ok(spoken.indexOf('Fim da página 1.')<spoken.indexOf('Página 2 do original.'));
    assert.ok(!spoken.includes('Resumo que deve ser ignorado.'));
    await request(`${path}/material-assets/${plan.id}/audio`,a,'GET',undefined,404);
    await request(`${path}/material-adaptations/${plan.id}/release`,main,'POST',{expectedRevision:draft.revision,reviewed:true});
    const own=(await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items.find((item:{id:string})=>item.id===plan.id);assert.equal(own.hasAudio,true);assert.equal(own.document.length,4);
    assert.equal((await fetch(`${base}${path}/material-assets/${plan.id}/audio`,{headers:{cookie:a}})).status,200);
    await request(`${path}/material-assets/${plan.id}/audio`,b,'GET',undefined,404);
  } finally { config.aiEnabled=false; }
});

test('limite de login persiste após recriar a aplicação e demo exige isolamento', { timeout: 30000 }, async () => {
  assert.throws(() => readConfig({ ...process.env, DEMO_ONLY: 'false' }));
  assert.equal(createAuth(db, { ...config, demo: false }).options.emailAndPassword?.minPasswordLength, 8);
  assert.equal(createAuth(db, config).options.emailAndPassword?.minPasswordLength, 8);
  await db.rateBucket.deleteMany();
  for (let i = 0; i < 20; i++) await request('/api/auth/sign-in/email', '', 'POST', { email: 'absent@example.invalid', password: testPassword }, 401);
  await request('/api/auth/sign-in/email', '', 'POST', { email: 'absent@example.invalid', password: testPassword }, 429);
  for (let i = 0; i < 10; i++) await request('/api/auth/sign-up/email', '', 'POST', {}, 400);
  await request('/api/auth/sign-up/email', '', 'POST', {}, 429);
  await runtime.app.close();
  runtime = await createApplication(db, config);
  await runtime.app.listen(0, '127.0.0.1'); base = await runtime.app.getUrl();
  await request('/api/auth/sign-in/email', '', 'POST', { email: 'absent@example.invalid', password: testPassword }, 429);
  await request('/api/auth/sign-up/email', '', 'POST', {}, 429);
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


