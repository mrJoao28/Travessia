import { test } from "node:test";
import assert from "node:assert/strict";
import { proxyBackend } from "../lib/backend-proxy.ts";

const settings = {
  internalUrl: "https://api.example.invalid",
  publicOrigin: "https://web.example.invalid",
};
function request(path, body, extra = {}) {
  return new Request(
    `https://web.example.invalid${path}`,
    body === undefined
      ? extra
      : {
          method: "POST",
          headers: {
            origin: settings.publicOrigin,
            "content-type": "application/json",
            ...extra,
          },
          body: JSON.stringify(body),
        },
  );
}
test("proxy denies missing config, unknown auth routes, cross-site writes and unsafe destination", async (t) => {
  assert.equal(
    (await proxyBackend(request("/api/v1/me"), "v1", ["me"], {})).status,
    503,
  );
  assert.equal(
    (
      await proxyBackend(
        request("/api/auth/reset-password", {}),
        "auth",
        ["reset-password"],
        settings,
      )
    ).status,
    404,
  );
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url.href, "https://api.example.invalid/api/auth/sign-up/email");
    return new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  assert.equal(
    (
      await proxyBackend(
        request("/api/auth/sign-up/email", { name: "Ana" }),
        "auth",
        ["sign-up", "email"],
        settings,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await proxyBackend(
        request("/api/v1/me", {}, { origin: "https://attacker.invalid" }),
        "v1",
        ["me"],
        settings,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await proxyBackend(request("/api/v1/me"), "v1", ["me"], {
        ...settings,
        internalUrl: "http://untrusted.invalid",
      })
    ).status,
    503,
  );
  assert.equal(
    (await proxyBackend(request("/api/v1/me"), "v1", [".."], settings)).status,
    400,
  );
});
test("proxy preserves cookies, origin, JSON, method, conflict status and separate Set-Cookie", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(
      url.href,
      "https://api.example.invalid/api/auth/sign-in/email",
    );
    assert.equal(init.method, "POST");
    assert.equal(init.headers.get("origin"), settings.publicOrigin);
    assert.equal(init.headers.get("cookie"), "session=existing");
    assert.equal(
      new TextDecoder().decode(init.body),
      '{"example":"fictitious"}',
    );
    assert.equal(init.redirect, "manual");
    const headers = new Headers({ "content-type": "application/json" });
    headers.append(
      "set-cookie",
      "session=new; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    headers.append(
      "set-cookie",
      "extra=1; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    return new Response('{"code":"REVISION_CONFLICT"}', {
      status: 409,
      headers,
    });
  });
  const response = await proxyBackend(
    request(
      "/api/auth/sign-in/email",
      { example: "fictitious" },
      { cookie: "session=existing" },
    ),
    "auth",
    ["sign-in", "email"],
    settings,
  );
  assert.equal(response.status, 409);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.getSetCookie().length, 2);
});
test("proxy does not follow redirects, leak upstream errors or issue internal-domain cookies", async (t) => {
  const mocked = t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://other.invalid" },
      }),
  );
  assert.equal(
    (await proxyBackend(request("/api/v1/me"), "v1", ["me"], settings)).status,
    502,
  );
  mocked.mock.mockImplementation(
    async () =>
      new Response(null, {
        headers: { "set-cookie": "session=token; Domain=api.example.invalid" },
      }),
  );
  const response = await proxyBackend(
    request("/api/v1/me"),
    "v1",
    ["me"],
    settings,
  );
  assert.equal(response.status, 502);
  assert.equal(response.headers.has("set-cookie"), false);
  mocked.mock.mockImplementation(async () => {
    throw new Error("private internal detail");
  });
  assert.doesNotMatch(
    await (
      await proxyBackend(request("/api/v1/me"), "v1", ["me"], settings)
    ).text(),
    /private internal detail/,
  );
});
test("proxy rejects a streamed body over the size limit", async () => {
  const response = await proxyBackend(
    request("/api/v1/missions", { content: "a".repeat(256 * 1024) }),
    "v1",
    ["missions"],
    settings,
  );
  assert.equal(response.status, 413);
});

test("produção permite HTTP somente para o serviço Compose exato e com opção do servidor", async (t) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const mocked = t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url.href, 'http://api:3001/v1/me');
    assert.equal(init.headers.get('cookie'), 'session=existing');
    return Response.json({ ok: true });
  });
  try {
    const compose = { ...settings, internalUrl: 'http://api:3001', allowInternalHttp: 'true' };
    assert.equal((await proxyBackend(request('/api/v1/me', undefined, { headers: { cookie: 'session=existing' } }), 'v1', ['me'], compose)).status, 200);
    for (const address of ['http://api:3002', 'http://api.attacker.invalid:3001', 'http://untrusted.invalid', 'http://api:3001/path', 'http://user:password@api:3001', 'http://api:3001?target=other']) {
      assert.equal((await proxyBackend(request('/api/v1/me'), 'v1', ['me'], { ...compose, internalUrl: address })).status, 503);
    }
    assert.equal((await proxyBackend(request('/api/v1/me'), 'v1', ['me'], { ...compose, allowInternalHttp: undefined })).status, 503);
    assert.equal(mocked.mock.callCount(), 1);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("headers do navegador não concedem exceção de HTTP interno ou contornam origem", async (t) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const mocked = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Upstream must not be reached'); });
  try {
    const withoutFlag = { ...settings, internalUrl: 'http://api:3001' };
    const forged = request('/api/v1/me', undefined, { headers: { 'api-internal-allow-http': 'true' } });
    assert.equal((await proxyBackend(forged, 'v1', ['me'], withoutFlag)).status, 503);
    assert.equal((await proxyBackend(request('/api/v1/me', {}, { origin: 'https://attacker.invalid' }), 'v1', ['me'], { ...withoutFlag, allowInternalHttp: 'true' })).status, 403);
    assert.equal(mocked.mock.callCount(), 0);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("áudio usa orçamento ampliado somente em escritas de aplicações, mantendo origem e limite do stream", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ ok: true }); });
  const medium = { audio: "a".repeat(100000) };
  assert.equal((await proxyBackend(request("/api/v1/missions/m/strategy-plans", medium), "v1", ["missions", "m", "strategy-plans"], settings)).status, 200);
  assert.equal((await proxyBackend(request("/api/auth/sign-in/email", medium), "auth", ["sign-in", "email"], settings)).status, 413);
  assert.equal((await proxyBackend(request("/api/v1/missions/m/ai-supports", medium), "v1", ["missions", "m", "ai-supports"], settings)).status, 413);
  assert.equal((await proxyBackend(request("/api/v1/missions/m/strategy-plans", medium, { origin: "https://attacker.invalid" }), "v1", ["missions", "m", "strategy-plans"], settings)).status, 403);
  assert.equal((await proxyBackend(request("/api/v1/missions/m/strategy-plans", { audio: "a".repeat(2 * 1024 * 1024) }), "v1", ["missions", "m", "strategy-plans"], settings)).status, 413);
  assert.equal(calls, 1);
});
