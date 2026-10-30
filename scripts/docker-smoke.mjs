import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = parseEnv(readFileSync(new URL('../.env.docker', import.meta.url), 'utf8'));
const base = new URL(env.APP_PUBLIC_ORIGIN);
const verifyPersistence = process.argv.includes('--verify-persistence');
const marker = 'Verificação Docker: rascunho preservado no volume PostgreSQL.';
function check(ok, message) { if (!ok) throw new Error(message); }
check(process.argv.slice(2).every(arg => arg === '--verify-persistence'), 'Argumento não reconhecido.');
check(env.DEMO_MODE === 'true' && env.DEMO_ONLY === 'true', 'Smoke exige demonstração isolada.');
check(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) && base.origin === env.APP_PUBLIC_ORIGIN,
  'Smoke só pode acessar uma origem local; nunca um servidor com dados reais.');

function compose(...args) {
  return execFileSync('docker', ['compose', '--env-file', '.env.docker', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
}
let cookie = '';
async function request(path, { method = 'GET', body, status = 200, origin = base.origin, authenticated = true } = {}) {
  const response = await fetch(new URL(path, base), {
    method, redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Origin: origin, ...(authenticated && cookie ? { Cookie: cookie } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  check(response.status === status, `Resposta inesperada em ${method} ${path}: HTTP ${response.status}.`);
  const json = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  return { response, json };
}
async function login() {
  const { response } = await request('/api/auth/sign-in/email', { method: 'POST', authenticated: false,
    body: { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD } });
  const cookies = response.headers.getSetCookie();
  check(cookies.length > 0 && cookies.every(c => /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)), 'Cookies de sessão sem os atributos esperados.');
  check(cookies.every(c => !/;\s*domain=/i.test(c)), 'Cookie deve pertencer somente à origem pública.');
  check(cookies.every(c => /;\s*secure(?:;|$)/i.test(c) === (base.protocol === 'https:')), 'Atributo Secure incompatível com a origem.');
  cookie = cookies.map(c => c.split(';')[0]).join('; ');
}

try {
  const ids = compose('ps', '-q').trim().split(/\s+/).filter(Boolean);
  check(ids.length === 3, 'São esperados três containers permanentes.');
  const containers = JSON.parse(execFileSync('docker', ['inspect', ...ids], { encoding: 'utf8' }));
  const names = containers.map(c => c.Config.Labels['com.docker.compose.service']).sort();
  check(JSON.stringify(names) === JSON.stringify(['api', 'db', 'frontend']), 'Serviços inesperados no Compose.');
  const shared = Object.keys(containers[0].NetworkSettings.Networks).filter(network =>
    containers.every(c => network in c.NetworkSettings.Networks));
  check(shared.length > 0, 'Os três serviços precisam compartilhar a rede.');
  for (const c of containers) {
    const service = c.Config.Labels['com.docker.compose.service'];
    check(c.State.Health?.Status === 'healthy', `Container ${service} não está saudável.`);
    if (service !== 'frontend') check(Object.values(c.NetworkSettings.Ports ?? {}).every(v => !v?.length), `Porta de ${service} publicada indevidamente.`);
    if (service === 'db') check(c.Mounts.some(m => m.Type === 'volume' && m.Destination === '/var/lib/postgresql/data'), 'Banco sem volume persistente.');
    if (service === 'frontend') {
      check(c.Config.Env.every(v => !/^(DATABASE_URL|DIRECT_URL|POSTGRES_PASSWORD|BETTER_AUTH_SECRET|GEMINI_API_KEY|DEMO_USER_PASSWORD)=/.test(v)), 'Segredo de backend presente no frontend.');
    }
    if (service !== 'db') check(c.Config.User === 'node', `Container ${service} precisa executar sem root.`);
  }
  console.log('Containers saudáveis, rede compartilhada, volume e isolamento de portas/segredos verificados.');
  await request('/login');
  await request('/perfil');
  for (const asset of ['mais-acesso-conecta.png', 'mais-acesso-auth.webp', 'learning-together.webp', 'teaching-pathways.webp']) {
    const r = await fetch(new URL(`/brand/${asset}`, base), { signal: AbortSignal.timeout(15000) });
    check(r.ok && (await r.arrayBuffer()).byteLength > 1000, 'Arte local ausente da imagem frontend.');
  }
  const optimized = await fetch(new URL('/_next/image?url=%2Fbrand%2Flearning-together.webp&w=640&q=75', base), { signal: AbortSignal.timeout(15000) });
  check(optimized.ok && optimized.headers.get('content-type')?.startsWith('image/'), 'Otimização de imagens indisponível.');
  check((await request('/api/v1/health')).json?.status === 'ok', 'API não acessível pelo frontend.');
  await request('/api/v1/me', { authenticated: false, status: 401 });
  await request('/api/v1/me/profile', { authenticated: false, status: 401 });
  await request('/api/auth/sign-up/email', { method: 'POST', body: {}, status: 404 });
  await login();
  check((await request('/api/auth/get-session')).json?.user?.id, 'Sessão não confirmada pelo proxy.');
  const me = (await request('/api/v1/me')).json;
  check(me.demo === true && me.id, 'Perfil da demonstração indisponível.');
  const classrooms = (await request('/api/v1/classrooms')).json.items;
  check(classrooms.filter(c => c.role === 'student').length === 3 && classrooms.some(c => c.role === 'teacher'), 'Vínculos do seed incorretos.');
  await request('/api/v1/me/preferences', { method: 'PATCH', body: { contrast: 'high' }, origin: 'https://attacker.invalid', status: 403 });
  await request('/api/v1/barriers/demo-barrier-private', { status: 404 });
  const mission = (await request('/api/v1/missions/demo-class-programacao-mission')).json;
  let own = (await request(`/api/v1/missions/${mission.id}/submissions`)).json.items.find(s => s.versionId === mission.publishedVersion.id);
  check(own?.currentStepId === mission.publishedVersion.steps[1].id, 'Retomada da etapa 2 não foi preservada.');
  if (verifyPersistence) {
    check(own.content === marker && me.preferences.spacing === 'wide', 'Dados não sobreviveram à recriação dos containers.');
    const profile = (await request('/api/v1/me/profile')).json;
    check(profile.student?.registration === 'docker-profile-test' && profile.teacher?.teachings?.length === 2,
      'Perfis acadêmicos não sobreviveram à recriação dos containers.');
  } else {
    check(own.status === 'draft', 'Use um banco de demonstração novo para este teste.');
    own = (await request(`/api/v1/missions/${mission.id}/submissions`, { method: 'POST', body: {
      versionId: own.versionId, content: marker, completedStepIds: own.completedStepIds,
      currentStepId: own.currentStepId, status: 'draft', expectedRevision: own.revision,
    } })).json;
    await request('/api/v1/me/preferences', { method: 'PATCH', body: { spacing: 'wide' } });
    check(own.content === marker, 'Rascunho não foi salvo.');
    const profile = (await request('/api/v1/me/profile', { method: 'PATCH', body: {
      student: { registration: 'docker-profile-test' }, teacher: { teachings: [
        { subject: 'Cálculo I', course: 'Computação' }, { subject: 'Cálculo I', course: 'Engenharia Elétrica' },
      ] },
    } })).json;
    check(profile.student.registration === 'docker-profile-test' && profile.teacher.teachings.length === 2, 'Perfis acadêmicos não foram salvos.');
  }
  const members = (await request('/api/v1/classrooms/demo-class-oficina/members')).json.items;
  check(members.filter(m => m.role === 'student').length === 8, 'Contexto docente indisponível.');
  const teacherMission = (await request('/api/v1/missions/demo-class-oficina-mission')).json;
  const teacherVersion = teacherMission.publishedVersion;
  const strategyPath = `/api/v1/missions/${teacherMission.id}/strategy-plans`;
  const supportMarker = 'Apoio pedagógico preservado no volume PostgreSQL.';
  const adaptationPath = `/api/v1/missions/${teacherMission.id}/adaptations`;
  const adaptationMarker = 'Atividade adaptada preservada no volume PostgreSQL.';
  if (verifyPersistence) {
    const needs = (await request('/api/v1/me/learning-needs')).json;
    check(needs.supports.includes('short-steps'), 'Escolhas privadas não persistiram no volume.');
    const adaptations = (await request(`${adaptationPath}?versionId=${teacherVersion.id}`)).json.items;
    check(adaptations.some(p => p.instructions === adaptationMarker && p.allowedFormats.includes('audio')), 'Adaptação e formatos de entrega não persistiram.');
  } else {
    const needs = (await request('/api/v1/me/learning-needs')).json;
    await request('/api/v1/me/learning-needs', { method: 'PATCH', body: { disabilities: [], supports: ['short-steps'], preferredFormats: ['text'], expectedRevision: needs.revision } });
    await request(adaptationPath, { method: 'POST', body: { versionId: teacherVersion.id, stepId: null, audience: 'classroom', studentIds: [],
      instructions: adaptationMarker, example: '', supportNeeds: ['short-steps'], allowedFormats: ['text', 'audio'], reviewed: true, requestKey: crypto.randomUUID() } });
  }
  const audio = Buffer.alloc(32044); audio.write('RIFF'); audio.writeUInt32LE(audio.length - 8, 4); audio.write('WAVEfmt ', 8);
  audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(16000, 24);
  audio.writeUInt32LE(32000, 28); audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(32000, 40);
  const audioBase64 = audio.toString('base64');
  if (verifyPersistence) {
    const plans = (await request(`${strategyPath}?versionId=${teacherVersion.id}`)).json.items;
    const persisted = plans.flatMap(plan => plan.items).find(item => item.content === supportMarker);
    check(persisted?.hasAudio, 'Estratégia e áudio não sobreviveram à recriação dos containers.');
    const storedAudio = (await request(`/api/v1/missions/${teacherMission.id}/support-audio/${persisted.id}`)).json;
    check(storedAudio.base64 === audioBase64, 'Bytes do áudio mudaram após recriar os containers.');
  } else {
    const recipients = (await request(`/api/v1/missions/${teacherMission.id}/strategy-recipients`)).json.items;
    check(recipients.length > 0, 'Destinatários da estratégia indisponíveis.');
    await request(strategyPath, { method: 'POST', body: { versionId: teacherVersion.id, stepId: teacherVersion.steps[0].id,
      audience: 'students', studentIds: [recipients[0].id], items: [{ strategyId: 'step-checklist', content: supportMarker, audio: { base64: audioBase64 } }],
      reviewed: true, requestKey: crypto.randomUUID() } });
  }
  await request('/api/auth/sign-out', { method: 'POST', body: {} });
  await request('/api/v1/me', { status: 401 });
  await login();
  const reloaded = (await request(`/api/v1/missions/${mission.id}/submissions`)).json.items.find(s => s.id === own.id);
  check(reloaded?.content === marker, 'Atividade não persistiu entre sessões.');
  await request('/api/auth/sign-out', { method: 'POST', body: {} });
  cookie = '';
  console.log(verifyPersistence
    ? 'Persistência confirmada após recriar os três containers com o mesmo volume.'
    : 'Frontend de produção, imagens, Prisma, login/logout, CSRF, permissões e persistência confirmados.');
} catch (error) {
  // Never dump inspect payloads, auth responses, connection strings or credentials.
  console.error(error instanceof Error && !('stdout' in error) ? error.message : 'Falha ao executar o smoke Docker. Confira serviços e configuração.');
  process.exitCode = 1;
}
