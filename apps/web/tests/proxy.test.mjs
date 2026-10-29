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
test("proxy denies missing config, unknown auth routes, cross-site writes and unsafe destination", async () => {
  assert.equal(
    (await proxyBackend(request("/api/v1/me"), "v1", ["me"], {})).status,
    503,
  );
  assert.equal(
    (
      await proxyBackend(
        request("/api/auth/sign-up/email", {}),
        "auth",
        ["sign-up", "email"],
        settings,
      )
    ).status,
    404,
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
