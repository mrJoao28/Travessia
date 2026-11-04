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
test('código curto da turma é privado, reutilizável, transacional e desativável', async()=>{
 const one=await provision('short-invite-one'),two=await provision('short-invite-two'),three=await provision('short-invite-three');
 await request(`/v1/classrooms/${workshop}/invitations`,a,'GET',undefined,404);
 await request(`/v1/classrooms/${workshop}/invitations`,otherTeacher,'GET',undefined,404);
 await request(`/v1/classrooms/${workshop}/invitations`,a,'POST',{reusable:true},404);
 const invite=(await request(`/v1/classrooms/${workshop}/invitations`,main,'POST',{reusable:true})).json;
 assert.match(invite.code,/^[A-HJ-NP-Z2-9]{8}$/);assert.equal(invite.reusable,true);
 const stored=await db.invitation.findUniqueOrThrow({where:{id:invite.id}});
 assert.ok(stored.codeHash&&stored.codeHash!==invite.code);assert.equal(stored.reusable,true);
 const list=(await request(`/v1/classrooms/${workshop}/invitations`,main)).json.items;
 assert.ok(list.some((r:any)=>r.id===invite.id));assert.ok(list.every((r:any)=>!('token' in r)&&!('code' in r)&&!('tokenHash' in r)&&!('codeHash' in r)));
 const joined=await Promise.all([request('/v1/invitations/accept',one.cookie,'POST',{token:invite.code}),request('/v1/invitations/accept',two.cookie,'POST',{token:invite.token})]);
 assert.ok(joined.every(r=>r.json.role==='student'));assert.equal((await db.invitation.findUniqueOrThrow({where:{id:invite.id}})).consumedAt,null);
 await request('/v1/invitations/accept',one.cookie,'POST',{token:invite.code},409);
 const member=await db.membership.findUniqueOrThrow({where:{userId_classroomId:{userId:one.user.id,classroomId:workshop}}});
 await request(`/v1/classrooms/${workshop}/members/${member.id}`,main,'DELETE');
 await request('/v1/invitations/accept',one.cookie,'POST',{token:invite.code},409);
 await request(`/v1/classrooms/${workshop}/invitations/${invite.id}`,main,'DELETE');
 await request('/v1/invitations/accept',three.cookie,'POST',{token:invite.code},400);
 await request('/v1/invitations/accept',three.cookie,'POST',{token:invite.token},400);
 assert.ok(!(await request(`/v1/classrooms/${workshop}/invitations`,main)).json.items.some((r:any)=>r.id===invite.id));
 const expired=(await request(`/v1/classrooms/${workshop}/invitations`,main,'POST',{reusable:true})).json;
 await db.invitation.update({where:{id:expired.id},data:{expiresAt:new Date(0)}});
 await request('/v1/invitations/accept',three.cookie,'POST',{token:expired.code},400);
 // Failed attempts, including valid-shaped guesses, are bounded per authenticated account.
 for(let i=0;i<21;i++){const response=await fetch(base+'/v1/invitations/accept',{method:'POST',headers:{cookie:three.cookie,origin:config.origin,'Content-Type':'application/json'},body:JSON.stringify({token:'ZZZZZZZZ'})});assert.ok([400,429].includes(response.status));if(i===20)assert.equal(response.status,429);}
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
test('estratégias: apoios por etapa/turma/aluno, privacidade, revisão, concorrência e revogação', async () => {
  await request('/v1/strategies', '', 'GET', undefined, 401);
  const catalog = (await request('/v1/strategies', main)).json.items;
  assert.equal(catalog.length, 8);
  const created = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  const version = created.draftVersion;
  await request(`/v1/missions/${created.id}/publish`, main, 'POST', { versionId: version.id, reviewed: true });
  const path = `/v1/missions/${created.id}`;
  const baseInput = { versionId: version.id, stepId: null, audience: 'classroom', studentIds: [], items: [{ strategyId: 'step-checklist', content: 'Apoio de toda a turma.' }], reviewed: true, requestKey: randomUUID() };
  const common = (await request(`${path}/strategy-plans`, main, 'POST', baseInput)).json;
  assert.equal((await request(`${path}/strategy-plans`, main, 'POST', baseInput)).json.id, common.id);
  await request(`${path}/strategy-plans`, main, 'POST', { ...baseInput, items: [{ strategyId: 'step-checklist', content: 'Conteúdo diferente.' }] }, 409);
  const personalA = (await request(`${path}/strategy-plans`, main, 'POST', { ...baseInput, requestKey: randomUUID(), stepId: version.steps[0].id, audience: 'students', studentIds: ['demo-student-1'], items: [{ strategyId: 'worked-example', content: 'Apoio individual exclusivo de A.' }] })).json;
  const personalB = (await request(`${path}/strategy-plans`, main, 'POST', { ...baseInput, requestKey: randomUUID(), audience: 'students', studentIds: ['demo-student-2'], items: [{ strategyId: 'context-glossary', content: 'Apoio individual exclusivo de B.' }] })).json;
  const ownA = (await request(`${path}/supports?versionId=${version.id}`, a)).json;
  const ownB = (await request(`${path}/supports?versionId=${version.id}`, b)).json;
  assert.equal(ownA.items.length, 2); assert.equal(ownB.items.length, 2);
  assert.ok(JSON.stringify(ownA).includes('exclusivo de A') && !JSON.stringify(ownA).includes('exclusivo de B'));
  assert.ok(!JSON.stringify(ownA).includes('recipients') && !JSON.stringify(ownA).includes('audience') && !JSON.stringify(ownA).includes('Pessoa'));
  assert.ok(ownA.items.some((i: any) => i.stepId === version.steps[0].id));
  await request(`${path}/strategy-plans?versionId=${version.id}`, a, 'GET', undefined, 404);
  await request(`${path}/strategy-plans?versionId=${version.id}`, otherTeacher, 'GET', undefined, 404);
  await request(`${path}/strategy-plans`, a, 'POST', baseInput, 404);
  await request(`${path}/strategy-recipients`, a, 'GET', undefined, 404);
  const recipients = (await request(`${path}/strategy-recipients?limit=1`, main)).json;
  assert.equal(recipients.items.length, 1); assert.ok(recipients.nextCursor);
  assert.ok(!JSON.stringify(recipients).includes('email'));
  const update = { versionId: version.id, stepId: null, audience: 'classroom', studentIds: [], items: [{ strategyId: 'step-checklist', content: 'Apoio atualizado.' }], reviewed: true, expectedRevision: common.revision };
  const concurrent = await Promise.all(['Versão A', 'Versão B'].map(content => fetch(base + `${path}/strategy-plans/${common.id}`, { method: 'PATCH', headers: { cookie: main, origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...update, items: [{ strategyId: 'step-checklist', content }] }) })));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  await db.membership.update({ where: { userId_classroomId: { userId: 'demo-student-1', classroomId: workshop } }, data: { active: false } });
  await request(`${path}/supports?versionId=${version.id}`, a, 'GET', undefined, 404);
  await request(`${path}/strategy-plans`, main, 'POST', { ...baseInput, requestKey: randomUUID(), audience: 'students', studentIds: ['demo-student-1'] }, 400);
  await db.membership.update({ where: { userId_classroomId: { userId: 'demo-student-1', classroomId: workshop } }, data: { active: true } });
  await db.membership.update({ where: { userId_classroomId: { userId: mainId, classroomId: workshop } }, data: { active: false } });
  await request(`${path}/strategy-plans?versionId=${version.id}`, main, 'GET', undefined, 404);
  await request(`${path}/strategy-plans/${personalA.id}/remove`, main, 'POST', { expectedRevision: personalA.revision }, 404);
  await db.membership.update({ where: { userId_classroomId: { userId: mainId, classroomId: workshop } }, data: { active: true } });
  await request(`${path}/strategy-plans/${personalB.id}/remove`, main, 'POST', { expectedRevision: personalB.revision });
  assert.equal(await db.strategyRecipient.count({ where: { planId: personalB.id } }), 0);
  assert.equal(await db.strategyItem.count({ where: { planId: personalB.id } }), 0);
  assert.equal((await request(`${path}/supports?versionId=${version.id}`, b)).json.items.length, 1);
  const draft = (await request(path, main, 'PATCH', { ...fixture, expectedDraftVersionId: null })).json.draftVersion;
  await request(`${path}/strategy-plans`, main, 'POST', { ...baseInput, versionId: draft.id, requestKey: randomUUID(), items: [{ strategyId: 'planning-outline', content: 'Apoio privado de rascunho.' }] });
  assert.ok(!JSON.stringify((await request(`${path}/supports?versionId=${version.id}`, a)).json).includes('rascunho'));
  await request(`${path}/supports?versionId=${draft.id}`, a, 'GET', undefined, 409);
  await request(`${path}/publish`, main, 'POST', { versionId: draft.id, reviewed: true });
  await request(`${path}/supports?versionId=${version.id}`, a, 'GET', undefined, 409);
  const newSupports = (await request(`${path}/supports?versionId=${draft.id}`, a)).json;
  assert.equal(newSupports.items.length, 1); assert.equal(newSupports.items[0].content, 'Apoio privado de rascunho.');
  await request(`${path}/strategy-plans/${personalA.id}/remove`, main, 'POST', { expectedRevision: personalA.revision }, 404);
});
test('estratégias rejeitam destinos cruzados, campos indevidos, falta de revisão e alterações em missão arquivada', async () => {
  const created = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  const path = `/v1/missions/${created.id}`;
  const input = { versionId: created.draftVersion.id, stepId: null, audience: 'classroom', studentIds: [], items: [{ strategyId: 'step-checklist', content: 'Conteúdo revisado.' }], reviewed: true, requestKey: randomUUID() };
  for (const change of [{ role: 'teacher' }, { ownerId: mainId }, { reviewed: false }, { studentIds: ['demo-student-1'] },
    { audience: 'students' }, { items: [] }, { items: [{ strategyId: 'diagnostico', content: 'x' }] },
    { items: [{ strategyId: 'step-checklist', content: ' ' }] }, { items: [{ strategyId: 'step-checklist', content: 'x'.repeat(3001) }] },
    { items: [...input.items, ...input.items] }, { audience: 'students', studentIds: ['demo-student-1', 'demo-student-1'] },
  ]) await request(`${path}/strategy-plans`, main, 'POST', { ...input, ...change }, 400);
  await request(`${path}/strategy-plans`, main, 'POST', { ...input, audience: 'students', studentIds: ['demo-teacher-programacao'] }, 400);
  await request(`${path}/strategy-plans`, main, 'POST', { ...input, versionId: 'foreign-version' }, 404);
  const foreign = await db.step.findFirstOrThrow({ where: { version: { mission: { classroomId: 'demo-class-calculo' } } } });
  await request(`${path}/strategy-plans`, main, 'POST', { ...input, stepId: foreign.id }, 404);
  await request(`${path}/strategy-plans`, main, 'POST', input, 403, 'https://attacker.invalid');
  assert.equal(await db.strategyPlan.count({ where: { versionId: input.versionId } }), 0);
  const plan = (await request(`${path}/strategy-plans`, main, 'POST', input)).json;
  await request(`${path}/strategy-plans/${plan.id}/remove`, main, 'POST', { expectedRevision: plan.revision + 1 }, 409);
  await request(`${path}/archive`, main, 'POST', {});
  await request(`${path}/strategy-plans/${plan.id}/remove`, main, 'POST', { expectedRevision: plan.revision }, 409);
  await request(`${path}/strategy-plans`, main, 'POST', { ...input, requestKey: randomUUID() }, 409);
});
function wavFixture() {
  const bytes = Buffer.alloc(64044); bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(16000, 24);
  bytes.writeUInt32LE(32000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes.toString('base64');
}
test('áudio privado: validação de bytes, A/B, preservação, referências cruzadas e revogação', async () => {
  const audio = wavFixture();
  assert.equal(Buffer.from(verifySupportAudio(audio)).toString('base64'), audio);
  for (const invalid of [Buffer.from('<script>bad</script>').toString('base64'), audio + 'AAAA', audio.replace(/^U/, 'X')]) assert.throws(() => verifySupportAudio(invalid));
  const created = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  const path = `/v1/missions/${created.id}`;
  const versionId = created.draftVersion.id;
  const input = { versionId, stepId: null, audience: 'students', studentIds: ['demo-student-1'], reviewed: true,
    items: [{ strategyId: 'text-alternative', content: 'Transcrição completa da descrição da imagem.', audio: { base64: audio } }], requestKey: randomUUID() };
  const plan = (await request(`${path}/strategy-plans`, main, 'POST', input)).json;
  const audioPath = `${path}/support-audio/${plan.items[0].id}`;
  assert.equal(plan.items[0].hasAudio, true); assert.ok(!JSON.stringify(plan).includes('base64'));
  await request(audioPath, '', 'GET', undefined, 401);
  await request(audioPath, a, 'GET', undefined, 404);
  await request(`${path}/publish`, main, 'POST', { versionId, reviewed: true });
  assert.equal((await request(audioPath, a)).json.base64, audio);
  await request(audioPath, b, 'GET', undefined, 404);
  await request(audioPath, otherTeacher, 'GET', undefined, 404);
  assert.ok(!JSON.stringify((await request(`${path}/supports?versionId=${versionId}`, a)).json).includes('base64'));
  await request(`${path}/strategy-plans`, main, 'POST', { ...input, requestKey: randomUUID(), items: [{ ...input.items[0], audio: { itemId: plan.items[0].id } }] }, 404);
  await request(`${path}/strategy-plans`, main, 'POST', { ...input, requestKey: randomUUID(), items: [{ ...input.items[0], audio: { base64: Buffer.from('invalid-file').toString('base64') } }] }, 400);
  const updated = (await request(`${path}/strategy-plans/${plan.id}`, main, 'PATCH', { versionId, stepId: null, audience: input.audience, studentIds: input.studentIds, reviewed: true,
    expectedRevision: 1, items: [{ ...input.items[0], audio: { itemId: plan.items[0].id } }] })).json;
  await request(audioPath, a, 'GET', undefined, 404);
  const newPath = `${path}/support-audio/${updated.items[0].id}`;
  assert.equal((await request(newPath, a)).json.base64, audio);
  await db.membership.update({ where: { userId_classroomId: { userId: 'demo-student-1', classroomId: workshop } }, data: { active: false } });
  await request(newPath, a, 'GET', undefined, 404);
  await db.membership.update({ where: { userId_classroomId: { userId: 'demo-student-1', classroomId: workshop } }, data: { active: true } });
  await request(`${path}/strategy-plans/${plan.id}/remove`, main, 'POST', { expectedRevision: 2 });
  await request(newPath, a, 'GET', undefined, 404);
});
test('Gemini para apoios: envio mínimo, revisão, deduplicação, saída inválida e acesso revogado durante a geração', async () => {
  const classroom = (await request('/v1/classrooms', main, 'POST', { name: 'Turma de testes da assistência' })).json;
  const mission = (await request(`/v1/classrooms/${classroom.id}/missions`, main, 'POST', fixture)).json;
  const path = `/v1/missions/${mission.id}/ai-supports`;
  const input = { versionId: mission.draftVersion.id, stepId: mission.draftVersion.steps[0].id, materialIds: [mission.draftVersion.materials[0].id], strategyIds: ['step-checklist'], activityAdaptation: true, supportNeeds: ['short-steps'], approvedForProvider: true, idempotencyKey: randomUUID() };
  await request(path, main, 'POST', input, 503);
  config.aiEnabled = true; config.model = 'fake-test-only';
  let calls = 0; let sent = ''; let invalid = false; let releaseSupport: (() => void) | undefined;
  let held = false;
  runtime.service.ai.supportProvider = async providerInput => {
    calls++; sent = JSON.stringify(providerInput);
    if (held) await new Promise<void>(resolve => { releaseSupport = resolve; });
    return invalid ? { items: [{ strategyId: 'text-alternative', content: 'Imagem inventada.' }] } : { items: [{ strategyId: 'step-checklist', content: 'Compare os custos. Depois justifique a escolha.' }] };
  };
  await request(path, a, 'POST', input, 404);
  await request(path, otherTeacher, 'POST', input, 404);
  await request(path, main, 'POST', { ...input, approvedForProvider: false }, 400);
  await request(path, main, 'POST', { ...input, strategyIds: ['text-alternative'] }, 400);
  await request(path, main, 'POST', { ...input, materialIds: ['foreign-material'] }, 404);
  const generated = (await request(path, main, 'POST', input)).json;
  assert.equal(generated.status, 'succeeded'); assert.equal(generated.draft.items.length, 1);
  assert.ok(sent.includes('Tarefa dividida em passos curtos'));
  assert.ok(sent.includes('Compare duas soluções.') && sent.includes('Justificar a escolha.'));
  assert.ok(!sent.includes('disabilities') && !sent.includes('visual'));
  assert.ok(!sent.includes('example.invalid') && !sent.includes('Joao') && !sent.includes('studentIds'));
  assert.equal((await request(path, main, 'POST', input)).json.id, generated.id); assert.equal(calls, 1);
  assert.equal(await db.strategyPlan.count({ where: { versionId: input.versionId } }), 0);
  assert.equal((await request(`/v1/missions/${mission.id}`, main)).json.publishedVersion, null);
  invalid = true;
  await request(path, main, 'POST', { ...input, idempotencyKey: randomUUID() }, 502);
  invalid = false; held = true;
  const generating = request(path, main, 'POST', { ...input, idempotencyKey: randomUUID() }, 404);
  while (!releaseSupport) await new Promise(resolve => setTimeout(resolve, 10));
  await request(path, main, 'POST', { ...input, idempotencyKey: randomUUID() }, 429);
  await db.membership.update({ where: { userId_classroomId: { userId: mainId, classroomId: classroom.id } }, data: { active: false } });
  try {
    releaseSupport();
    assert.equal((await generating).json.code, 'NOT_FOUND');
  } finally {
    config.aiEnabled = false;
    await db.membership.update({ where: { userId_classroomId: { userId: mainId, classroomId: classroom.id } }, data: { active: true } });
  }
});
test('necessidades autodeclaradas são privadas: compartilhamento separado, revogável e restrito à turma', async () => {
  await request('/v1/me/learning-needs', '', 'GET', undefined, 401);
  await request('/v1/me/learning-needs', a, 'PATCH', { disabilities: ['visual'], supports: ['image-description'], preferredFormats: ['audio'], expectedRevision: 0, userId: mainId }, 400);
  const saved = (await request('/v1/me/learning-needs', a, 'PATCH', { disabilities: ['visual'], supports: ['image-description', 'short-steps'], preferredFormats: ['audio'], expectedRevision: 0 })).json;
  assert.equal(saved.revision, 1);
  assert.equal((await request('/v1/me/learning-needs', b)).json.disabilities.length, 0);
  assert.equal((await request(`/v1/classrooms/${workshop}/learning-needs`, main)).json.items.length, 0);
  await request(`/v1/classrooms/${workshop}/learning-needs`, b, 'GET', undefined, 404);
  await request(`/v1/classrooms/${workshop}/learning-needs`, otherTeacher, 'GET', undefined, 404);
  await request(`/v1/classrooms/demo-class-calculo/needs-sharing`, a, 'PATCH', { shared: true, includeDisabilities: true, expectedRevision: 0 }, 404);
  const shared = (await request(`/v1/classrooms/${workshop}/needs-sharing`, a, 'PATCH', { shared: true, includeDisabilities: false, expectedRevision: 0 })).json;
  let received = (await request(`/v1/classrooms/${workshop}/learning-needs`, main)).json.items;
  assert.equal(received[0].disabilities, null); assert.deepEqual(received[0].supports, ['image-description', 'short-steps']);
  await request(`/v1/classrooms/${workshop}/needs-sharing`, a, 'PATCH', { shared: true, includeDisabilities: true, expectedRevision: shared.revision });
  received = (await request(`/v1/classrooms/${workshop}/learning-needs`, main)).json.items;
  assert.deepEqual(received[0].disabilities, ['visual']);
  await request('/v1/me/learning-needs', a, 'PATCH', { disabilities: ['hearing'], supports: ['transcript'], preferredFormats: ['text'], expectedRevision: 1 });
  assert.equal((await request(`/v1/classrooms/${workshop}/learning-needs`, main)).json.items.length, 0);
  const permission = (await request(`/v1/classrooms/${workshop}/needs-sharing`, a)).json;
  assert.equal(permission.shared, false); assert.equal(permission.includeDisabilities, false);
  await request(`/v1/classrooms/${workshop}/needs-sharing`, a, 'PATCH', { shared: true, includeDisabilities: false, expectedRevision: permission.revision });
  await db.membership.update({ where: { userId_classroomId: { userId: 'demo-student-1', classroomId: workshop } }, data: { active: false } });
  assert.equal((await request(`/v1/classrooms/${workshop}/learning-needs`, main)).json.items.length, 0);
  await db.membership.update({ where: { userId_classroomId: { userId: 'demo-student-1', classroomId: workshop } }, data: { active: true } });
  const permission2 = (await request(`/v1/classrooms/${workshop}/needs-sharing`, a)).json;
  await request(`/v1/classrooms/${workshop}/needs-sharing`, a, 'PATCH', { shared: false, includeDisabilities: false, expectedRevision: permission2.revision });
  assert.equal((await request(`/v1/classrooms/${workshop}/learning-needs`, main)).json.items.length, 0);
});
test('adaptações e respostas multimodais: autorização por aluno, bytes privados, preservação e revisão', async () => {
  const created = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  const version = created.draftVersion; const path = `/v1/missions/${created.id}`;
  await request(`${path}/publish`, main, 'POST', { versionId: version.id, reviewed: true });
  const input = { versionId: version.id, stepId: version.steps[0].id, audience: 'students', studentIds: ['demo-student-1'], instructions: 'Compare um custo por vez e depois justifique a escolha.', example: 'Primeiro custo A; depois custo B.', supportNeeds: ['short-steps'], allowedFormats: ['text', 'audio', 'text_file'], reviewed: true, requestKey: randomUUID() };
  await request(`${path}/adaptations`, a, 'POST', input, 404);
  await request(`${path}/adaptations`, otherTeacher, 'POST', input, 404);
  await request(`${path}/adaptations`, main, 'POST', { ...input, reviewed: false }, 400);
  await request(`${path}/adaptations`, main, 'POST', { ...input, allowedFormats: ['audio'] }, 400);
  await request(`${path}/adaptations`, main, 'POST', { ...input, studentIds: ['demo-teacher-programacao'] }, 400);
  const plan = (await request(`${path}/adaptations`, main, 'POST', input)).json;
  assert.equal((await request(`${path}/adaptations`, main, 'POST', input)).json.id, plan.id);
  await request(`${path}/adaptations?versionId=${version.id}`, a, 'GET', undefined, 404);
  const own = (await request(`${path}/my-adaptations?versionId=${version.id}`, a)).json;
  const other = (await request(`${path}/my-adaptations?versionId=${version.id}`, b)).json;
  assert.equal(own.items.length, 1); assert.equal(other.items.length, 0); assert.deepEqual(other.allowedFormats, ['text']);
  assert.ok(!JSON.stringify(own).includes('studentIds') && !JSON.stringify(own).includes('supportNeeds'));
  const response = { versionId: version.id, content: '', currentStepId: version.steps[0].id, completedStepIds: [], status: 'draft', expectedRevision: 0, audio: wavFixture(), textFile: { text: 'Texto privado entregue em arquivo.' } };
  await request(`${path}/submissions`, b, 'POST', response, 409);
  const saved = (await request(`${path}/submissions`, a, 'POST', response)).json;
  assert.equal(saved.hasAudio, true); assert.equal(saved.hasTextFile, true); assert.ok(!JSON.stringify(saved).includes('base64'));
  await request(`/v1/submissions/${saved.id}/audio`, main, 'GET', undefined, 404);
  await request(`/v1/submissions/${saved.id}/text-file`, b, 'GET', undefined, 404);
  const submitted = (await request(`${path}/submissions`, a, 'POST', { versionId: version.id, content: '', currentStepId: version.steps[0].id, completedStepIds: [], status: 'submitted', expectedRevision: saved.revision })).json;
  assert.equal(submitted.hasAudio, true); assert.equal(submitted.hasTextFile, true);
  assert.equal((await request(`/v1/submissions/${saved.id}/audio`, main)).json.base64, response.audio);
  assert.equal((await request(`/v1/submissions/${saved.id}/text-file`, main)).json.text, response.textFile.text);
  await request(`/v1/submissions/${saved.id}/audio`, otherTeacher, 'GET', undefined, 404);
  await request(`/v1/submissions/${saved.id}/audio`, b, 'GET', undefined, 404);
  await request(`/v1/submissions/${saved.id}/audio`, '', 'GET', undefined, 401);
  await request(`/v1/submissions/${saved.id}/feedback`, main, 'POST', { content: 'Feedback após escutar e ler a atividade.' });
  assert.equal((await request(`/v1/submissions/${saved.id}/text-file`, main)).json.name, 'atividade.txt');
  await request(`${path}/adaptations/${plan.id}/remove`, main, 'POST', { expectedRevision: 2 }, 409);
  await request(`${path}/adaptations/${plan.id}/remove`, main, 'POST', { expectedRevision: 1 });
  assert.deepEqual((await request(`${path}/my-adaptations?versionId=${version.id}`, a)).json.allowedFormats, ['text']);
  assert.equal((await request(`/v1/submissions/${saved.id}/audio`, main)).json.base64, response.audio);
  await db.membership.update({ where: { userId_classroomId: { userId: 'demo-student-1', classroomId: workshop } }, data: { active: false } });
  await request(`/v1/submissions/${saved.id}/audio`, a, 'GET', undefined, 404);
  await db.membership.update({ where: { userId_classroomId: { userId: 'demo-student-1', classroomId: workshop } }, data: { active: true } });
});
test('adaptação valida versões, edições concorrentes, arquivos de texto e formatos revogados', async () => {
  const created = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  const v = created.draftVersion; const path = `/v1/missions/${created.id}`;
  const input = { versionId: v.id, stepId: null, audience: 'classroom', studentIds: [], instructions: 'Enunciado adaptado.', example: '', supportNeeds: [], allowedFormats: ['text', 'text_file', 'audio'], reviewed: true, requestKey: randomUUID() };
  const plan = (await request(`${path}/adaptations`, main, 'POST', input)).json;
  await request(`${path}/my-adaptations?versionId=${v.id}`, a, 'GET', undefined, 404);
  await request(`${path}/publish`, main, 'POST', { versionId: v.id, reviewed: true });
  const response = { versionId: v.id, content: '', currentStepId: v.steps[0].id, completedStepIds: [], status: 'submitted', expectedRevision: 0 };
  await request(`${path}/submissions`, a, 'POST', response, 400);
  await request(`${path}/submissions`, a, 'POST', { ...response, textFile: { text: '\u0000binary' } }, 400);
  await request(`${path}/submissions`, a, 'POST', { ...response, audio: Buffer.from('bad-file'.repeat(10)).toString('base64') }, 400);
  const { requestKey, ...edit } = input;
  const concurrent = await Promise.all(['A', 'B'].map(instructions => fetch(base + `${path}/adaptations/${plan.id}`, { method: 'PATCH', headers: { cookie: main, origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...edit, instructions, expectedRevision: 1 }) })));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  const savedDraft = (await request(`${path}/submissions`, a, 'POST', { ...response, status: 'draft', audio: wavFixture() })).json;
  await request(`${path}/adaptations/${plan.id}/remove`, main, 'POST', { expectedRevision: 2 });
  await request(`${path}/submissions`, a, 'POST', { ...response, status: 'draft', content: 'Texto preservado.', expectedRevision: savedDraft.revision }, 409);
  await request(`${path}/submissions`, a, 'POST', { ...response, status: 'draft', content: 'Texto preservado.', audio: null, expectedRevision: savedDraft.revision });
  const draft = (await request(path, main, 'PATCH', { ...fixture, expectedDraftVersionId: null })).json.draftVersion;
  await request(`${path}/adaptations`, main, 'POST', { ...input, versionId: draft.id, stepId: v.steps[0].id, requestKey: randomUUID() }, 404);
  await request(`${path}/publish`, main, 'POST', { versionId: draft.id, reviewed: true });
  await request(`${path}/my-adaptations?versionId=${v.id}`, a, 'GET', undefined, 409);
  assert.equal((await request(`${path}/my-adaptations?versionId=${draft.id}`, a)).json.items.length, 0);
  await request(`${path}/archive`, main, 'POST', {});
  await request(`${path}/adaptations`, main, 'POST', { ...input, versionId: draft.id, requestKey: randomUUID() }, 409);
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
test('materiais individuais: fila, revisão, cache, IA mínima e arquivos privados A/B', { timeout: 30000 }, async () => {
  const created = (await request(`/v1/classrooms/${workshop}/missions`, main, 'POST', fixture)).json;
  const versionId = created.draftVersion.id, path = `/v1/missions/${created.id}`;
  await request(`${path}/publish`, main, 'POST', { versionId, reviewed: true });
  const upload = { versionId, title: 'Documento de teste', base64: Buffer.from('%PDF-1.4\nfixture').toString('base64'), requestKey: randomUUID() };
  await request(`${path}/material-sources`, '', 'POST', upload, 401);
  await request(`${path}/material-sources`, a, 'POST', upload, 404);
  await request(`${path}/material-sources`, otherTeacher, 'POST', upload, 404);
  await request(`${path}/material-sources`, main, 'POST', { ...upload, base64: 'bm90LXBkZg==' }, 400);
  const source = (await request(`${path}/material-sources`, main, 'POST', upload)).json;
  assert.equal(source.status, 'queued'); assert.equal(source.pages.length, 0);
  assert.equal((await request(`${path}/material-sources`, main, 'POST', upload)).json.id, source.id);
  await request(`${path}/material-assets/${source.id}/original`, main, 'GET', undefined, 404);
  await request(`${path}/material-assets/${source.id}/page-1`, main, 'GET', undefined, 404);
  let audioScript = '';
  const local = async (mode: 'extract' | 'audio', filename: string, script?: string) => {
    if (mode === 'extract') { await writeFile(materialPath(source.id, 'page-1.png'), 'visual fixture'); return { pages: [{ page: 1, text: 'Dados: 10 metros. Compare alternativas.', hasVisual: true, ocr: false }], warnings: ['Conferir tabela.'] }; }
    audioScript = script ?? '';
    await writeFile(filename, 'audio fixture'); return {};
  };
  let renderedHtml = '';
  const pdf = async (filename: string, html: string) => { renderedHtml = html; assert.ok(html.includes('lang="pt-BR"')); assert.ok(!html.includes('<script>')); await writeFile(filename, '%PDF-render fixture'); };
  let calls = 0, sent = '';
  const worker = new MaterialWorker(db, config, async input => { calls++; sent=JSON.stringify(input); return { document: input.pages.map(p=>({ page:p.page,title:'Comparar dados',text:'Dados: 10 metros. Compare alternativas.',description:'Diagrama compara duas alternativas.', steps:['Compare as alternativas.'], glossary:[{term:'Alternativa',definition:'Uma opção entre as disponíveis.'}] })), inputTokens: 123, outputTokens: 45 }; }, local, pdf);
  await worker.tick();
  const ready = (await request(`${path}/material-sources?versionId=${versionId}`, main)).json.items[0]; assert.equal(ready.status, 'ready');
  const sourceImage=await fetch(`${base}${path}/material-assets/${source.id}/page-1`,{headers:{cookie:main}});assert.equal(sourceImage.status,200);assert.equal(sourceImage.headers.get('content-type'),'image/png');
  for(const cookie of [a,b,otherTeacher])await request(`${path}/material-assets/${source.id}/page-1`,cookie,'GET',undefined,404);
  await request(`${path}/material-assets/${source.id}/page-2`,main,'GET',undefined,404);
  const settings = { supports: ['large-print','narration'], fontSize:'22', color:'high', useAi:false, approvedForProvider:false };
  const input = { versionId, sourceId:source.id, studentId:'demo-student-1', pages:[1], settings, requestKey:randomUUID() };
  await request(`${path}/material-adaptations`, main, 'POST', { ...input, studentId:mainId }, 400);
  await request(`${path}/material-adaptations`, main, 'POST', { ...input, pages:[2] }, 400);
  const plan = (await request(`${path}/material-adaptations`, main, 'POST', input)).json;
  assert.equal((await request(`${path}/material-adaptations`, main, 'POST', input)).json.id, plan.id);
  await worker.tick(); assert.equal(calls,0,'Formatação e voz não chamam a IA');
  let draft = (await request(`${path}/material-adaptations?versionId=${versionId}`, main)).json.items[0];
  assert.equal(draft.status,'draft');
  await request(`${path}/material-adaptations/${plan.id}/release`,main,'POST',{expectedRevision:1,reviewed:true},409);
  assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items.length,0);
  const malicious = [{page:1,title:'Teste',text:'<script>alert(1)</script> Dados: 10 metros.',description:'Diagrama.'}];
  draft=(await request(`${path}/material-adaptations/${plan.id}`,main,'PATCH',{expectedRevision:1,document:malicious})).json;
  await request(`${path}/material-adaptations/${plan.id}`,main,'PATCH',{expectedRevision:1,document:malicious},409);
  await request(`${path}/material-adaptations/${plan.id}/render`,main,'POST',{expectedRevision:draft.revision});
  await worker.tick();
  let rendered = (await request(`${path}/material-adaptations?versionId=${versionId}`,main)).json.items[0]; assert.equal(rendered.status,'ready');assert.equal(rendered.hasAudio,true);
  await request(`${path}/material-adaptations/${plan.id}/release`,main,'POST',{expectedRevision:rendered.revision},400);
  await request(`${path}/material-adaptations/${plan.id}/release`,main,'POST',{expectedRevision:rendered.revision,reviewed:true});
  const student = (await request(`${path}/my-materials?versionId=${versionId}`,a)).json; assert.equal(student.items.length,1);assert.ok(!JSON.stringify(student).includes('studentId'));
  assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,b)).json.items.length,0);
  async function file(kind:string, cookie:string,status=200) { const r=await fetch(`${base}${path}/material-assets/${plan.id}/${kind}`,{headers:{cookie}});assert.equal(r.status,status);return r; }
  assert.equal((await file('pdf',a)).headers.get('content-type'),'application/pdf');
  await file('audio',a);await file('page-1',a);await file('page-2',a,404);await file('pdf',b,404);await file('audio',otherTeacher,404);
  await request(`${path}/material-assets/${source.id}/original`,a,'GET',undefined,404);
  await db.membership.update({where:{userId_classroomId:{userId:'demo-student-1',classroomId:workshop}},data:{active:false}});await file('pdf',a,404);
  await db.membership.update({where:{userId_classroomId:{userId:'demo-student-1',classroomId:workshop}},data:{active:true}});
  await request(`${path}/material-adaptations/${plan.id}`,main,'PATCH',{expectedRevision:rendered.revision,document:malicious});await file('pdf',a,404);
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
  const structured = (await request(`${path}/material-adaptations`, main, 'POST', {
    ...input, requestKey: randomUUID(), settings: { supports: ['short-sections', 'glossary', 'high-contrast', 'large-print', 'wide-spacing', 'narration'],
      fontSize: '18', color: 'default', useAi: true, approvedForProvider: true },
  })).json;
  assert.equal(structured.settings.color, 'high');
  assert.equal(structured.settings.fontSize, '22');
  await worker.tick();
  const structuredDraft = (await request(`${path}/material-adaptations?versionId=${versionId}`, main)).json.items.find((item: {id: string}) => item.id === structured.id);
  assert.equal(structuredDraft.status, 'draft');
  assert.deepEqual(structuredDraft.document[0], {
    page: 1, title: 'Página 1', text: 'Dados: 10 metros. Compare alternativas.', description: '',
    steps: ['Compare as alternativas.'], glossary: [{ term: 'Alternativa', definition: 'Uma opção entre as disponíveis.' }],
  });
  const structuredPath = `${path}/material-adaptations/${structured.id}`;
  const edited = (await request(structuredPath, main, 'PATCH', { expectedRevision: structuredDraft.revision, document: [{
    ...structuredDraft.document[0], steps: ['Compare <A> e <B>.'],
  }] })).json;
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
  assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items.length,41,'Nenhum material liberado deve sumir além do quadragésimo item');
  await request(`${path}/material-sources/${source.id}`,main,'DELETE');await file('pdf',a,404);await worker.collect();
  assert.equal(await db.materialSource.count({where:{id:source.id}}),0);
});
test('PDF original individual: revisão, isolamento A/B, quarentena, revogação, versão e retirada',async()=>{
 const created=(await request(`/v1/classrooms/${workshop}/missions`,main,'POST',fixture)).json;
 const versionId=created.draftVersion.id,path=`/v1/missions/${created.id}`;
 const bytes=Buffer.from('%PDF-1.4\noriginal privado completo');
 const source=(await request(`${path}/material-sources`,main,'POST',{versionId,title:'Original',base64:bytes.toString('base64'),requestKey:randomUUID()})).json;
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
 assert.deepEqual(Buffer.from(await (await file(a)).arrayBuffer()),bytes);
 assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items[0].mode,'original');
 assert.equal((await request(`${path}/my-materials?versionId=${versionId}`,b)).json.items.length,0);
 await file(b,404);await file(otherTeacher,404);await file(a,404,'audio');await file(a,404,'page-1');
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
test('narração integral: quatro páginas preservadas, descrição IA separada e voz exclusivamente local', { timeout: 30000 }, async () => {
  const mission = (await request(`/v1/classrooms/${workshop}/missions`,main,'POST',fixture)).json;
  const versionId=mission.draftVersion.id, path=`/v1/missions/${mission.id}`;
  await request(`${path}/publish`,main,'POST',{versionId,reviewed:true});
  const source=(await request(`${path}/material-sources`,main,'POST',{versionId,title:'Quatro páginas fictícias',base64:Buffer.from('%PDF-1.4\nfixture').toString('base64'),requestKey:randomUUID()})).json;
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
    const own=(await request(`${path}/my-materials?versionId=${versionId}`,a)).json.items[0];assert.equal(own.hasAudio,true);assert.equal(own.document.length,4);
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


