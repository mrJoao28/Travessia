import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer, type RequestListener } from 'node:http';
import { once } from 'node:events';
import { ConfigurationError, readConfig } from '../src/config.js';
import { db } from '../src/database.js';

// This test file has its own process. No local listener should start on import.
process.env.VERCEL = '1';
after(async () => { await db.$disconnect(); });

async function serve(handler: RequestListener, run: (base: string) => Promise<void>) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('export serverless atende cold starts concorrentes e mantém autorização e Helmet', async () => {
  const { default: handler } = await import('../src/main.js');
  assert.equal(typeof handler, 'function');
  await serve(handler, async base => {
    const responses = await Promise.all(Array.from({ length: 6 }, () => fetch(`${base}/v1/health`)));
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(response.headers.get('content-security-policy'));
      assert.deepEqual(await response.json(), { status: 'ok', service: 'travessia-api', stage: 'mvp' });
    }
    assert.equal((await fetch(`${base}/v1/me`)).status, 401);
    const denied = await fetch(`${base}/api/auth/sign-in/email`, {
      method: 'POST', headers: { origin: 'https://untrusted.example.invalid', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'fixture@example.invalid', password: 'fictional-test-password' }),
    });
    assert.equal(denied.status, 403);
  });
});

test('configuração inválida produz diagnóstico de campo sem valores privados', async () => {
  const sentinel = 'private-value-must-never-appear';
  const invalidURL = `postgresql://fixture:${sentinel}@localhost/fixture?schema=public`;
  assert.throws(() => readConfig({ ...process.env, DATABASE_URL: invalidURL }), error => {
    assert.ok(error instanceof ConfigurationError);
    assert.deepEqual(error.variables, ['DATABASE_URL']);
    assert.ok(!error.message.includes(sentinel));
    return true;
  });
  const previousURL = process.env.DATABASE_URL;
  const originalError = console.error;
  const logs: unknown[][] = [];
  console.error = (...args: unknown[]) => { logs.push(args); };
  process.env.DATABASE_URL = invalidURL;
  try {
    // Separate module instance provides a fresh, failing cold start.
    const moduleURL = new URL('../src/main.ts?invalid-environment', import.meta.url).href;
    const { default: handler } = await import(moduleURL);
    await serve(handler, async base => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(`${base}/v1/health`);
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const text = await response.text();
        assert.equal(JSON.parse(text).code, 'API_UNAVAILABLE');
        assert.ok(!text.includes(sentinel) && !text.includes('DATABASE_URL'));
      }
    });
    assert.equal(logs.length, 1);
    const log = JSON.stringify(logs);
    assert.ok(log.includes('INVALID_ENVIRONMENT') && log.includes('DATABASE_URL'));
    assert.ok(!log.includes(sentinel) && !log.includes(invalidURL));
  } finally {
    console.error = originalError;
    if (previousURL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousURL;
  }
});
