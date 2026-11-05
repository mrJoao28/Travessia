import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';

const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
const permission = 'chatgpt.tokens.use.direct';
const directory = join(homedir(), '.travessia-chatgpt-test');
const sessionFile = join(directory, 'session.json');
const hostFile = join(directory, 'host-id');
const token = z.object({
  access_token: z.string().min(1), id_token: z.string().min(1),
  expires_in: z.number().positive(), scope: z.string(),
});
const sessionSchema = z.object({
  accessToken: z.string().min(1), expires: z.number(),
  clientId: z.string(), subject: z.string(),
});
const random = () => randomBytes(32).toString('base64url');

export async function startAuthorization(redirectUri: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try { await writeFile(hostFile, 'urn:uuid:' + randomUUID(), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const host = await readFile(hostFile, 'utf8');
  const previous = await readFile(sessionFile, 'utf8').then(raw => sessionSchema.parse(JSON.parse(raw)), error => {
    if (error.code !== 'ENOENT') throw error;
  });
  const state = random(), nonce = random(), verifier = random();
  const url = new URL('/api/accounts/authorize', issuer);
  url.search = new URLSearchParams({
    client_id: previous?.clientId ?? 'dynamic_agent_client',
    ...(!previous ? { agent_name_hint: 'Travessia Local' } : {}),
    ext_agent_host_id: host, response_type: 'code', redirect_uri: redirectUri,
    resource, scope: 'openid profile email offline_access resource.invoke ' + permission,
    state, nonce, code_challenge_method: 'S256',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  }).toString();
  return { url, state, nonce, verifier, redirectUri, previous, expires: Date.now() + 600000 };
}

export async function finishAuthorization(attempt: Awaited<ReturnType<typeof startAuthorization>>, params: URLSearchParams) {
  if (attempt.expires < Date.now() || params.get('state') !== attempt.state || params.has('error')) throw new Error('Invalid authorization');
  const code = params.get('code');
  const clientId = params.get('client_id') ?? attempt.previous?.clientId;
  if (!code || !clientId || !/^oaiapp_[\w-]+$/.test(clientId) || (attempt.previous && clientId !== attempt.previous.clientId)) throw new Error('Invalid registration');
  const signal = AbortSignal.timeout(15000);
  const response = await fetch(issuer + '/api/accounts/oauth/token', {
    method: 'POST', redirect: 'error', signal,
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, code_verifier: attempt.verifier, redirect_uri: attempt.redirectUri, resource }),
  });
  if (!response.ok) throw new Error('Authorization exchange failed');
  const data = token.parse(await response.json());
  if (!data.scope.split(/\s+/).includes(permission)) throw new Error('Missing plan permission');
  const discovery = await fetch(issuer + '/.well-known/openid-configuration', { signal, redirect: 'error' });
  if (!discovery.ok) throw new Error('Discovery failed');
  const metadata = z.object({ issuer: z.literal(issuer), jwks_uri: z.url() }).parse(await discovery.json());
  const jwks = new URL(metadata.jwks_uri);
  if (jwks.origin !== issuer) throw new Error('Unexpected issuer keys');
  const { payload } = await jwtVerify(data.id_token, createRemoteJWKSet(jwks), { issuer, audience: clientId, requiredClaims: ['sub', 'exp', 'iat'] });
  if (payload.nonce !== attempt.nonce || !payload.sub || (attempt.previous && payload.sub !== attempt.previous.subject)) throw new Error('Invalid identity');
  const saved = { clientId, subject: payload.sub, accessToken: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  const temporary = sessionFile + '.' + randomUUID();
  await writeFile(temporary, JSON.stringify(saved), { flag: 'wx', mode: 0o600 });
  await rename(temporary, sessionFile);
}

async function activeSession() {
  const session = await readFile(sessionFile, 'utf8').then(raw => sessionSchema.parse(JSON.parse(raw)), () => null);
  if (!session || session.expires <= Date.now()) throw Object.assign(new Error('Reconnect ChatGPT'), { status: 401 });
  return session;
}

export async function listChatGPTModels() {
  const session = await activeSession();
  const response = await fetch(resource + '/models', {
    headers: { Authorization: 'Bearer ' + session.accessToken },
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Model list unavailable');
  const catalog = z.object({ models: z.array(z.object({ slug: z.string(), visibility: z.string() })) }).parse(await response.json());
  return catalog.models.filter(model => model.visibility === 'list').map(model => model.slug);
}

export async function chatgptJson(model: string, instructions: string, schema: object, input: unknown, images: { page: number; image?: Buffer }[], limit: number, signal: AbortSignal, maxOutputChars = 80000) {
  const session = await activeSession();
  const content: object[] = [{ type: 'input_text', text: JSON.stringify(input) }];
  for (const page of images) {
    if (!page.image) continue;
    content.push({ type: 'input_text', text: 'Imagem da página ' + page.page },
      { type: 'input_image', detail: 'auto', image_url: 'data:image/png;base64,' + page.image.toString('base64') });
  }
  const response = await fetch(resource + '/responses', {
    method: 'POST', signal, redirect: 'error',
    headers: { Authorization: 'Bearer ' + session.accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: true, store: false,
      instructions: instructions + '\nSeja conciso e limite a saída a aproximadamente ' + limit + ' tokens.\nFormato JSON esperado: ' + JSON.stringify(schema),
      input: [{ role: 'user', content }] }),
  });
  if (!response.ok || !response.body) throw Object.assign(new Error('ChatGPT indisponível'), { status: response.status });
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '', output = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += chunk.value;
      if (buffer.length > 512000) throw new Error('Oversized response');
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trimEnd();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf('\n');
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        const event = JSON.parse(line.slice(6));
        if (event.type === 'response.output_text.delta') output += event.delta;
        if (output.length > maxOutputChars) throw new Error('Oversized output');
        if (event.type === 'response.completed') return { value: JSON.parse(output), inputTokens: event.response?.usage?.input_tokens as number | undefined, outputTokens: event.response?.usage?.output_tokens as number | undefined };
        if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) throw new Error('Incomplete response');
      }
    }
    throw new Error('Incomplete stream');
  } finally {
    await reader.cancel().catch(() => {});
  }
}
