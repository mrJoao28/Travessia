const safeMethods = new Set(["GET", "HEAD"]);
const authPaths = new Set(["sign-in/email", "sign-out", "get-session"]);
const maxBodyBytes = 64 * 1024;
type ProxySettings = {
  internalUrl?: string;
  publicOrigin?: string;
  allowInternalHttp?: string;
};

function failure(status: number, code: string, message: string) {
  return Response.json(
    { code, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Destination comes only from the server environment; no client-supplied URL. */
export async function proxyBackend(
  request: Request,
  group: "auth" | "v1",
  path: string[],
  settings: ProxySettings = {
    internalUrl: process.env.API_INTERNAL_URL,
    publicOrigin: process.env.WEB_PUBLIC_ORIGIN,
    allowInternalHttp: process.env.API_INTERNAL_ALLOW_HTTP,
  },
) {
  if (!path.length || path.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment)))
    return failure(400, "INVALID_PATH", "Caminho inválido.");
  if (group === "auth" && !authPaths.has(path.join("/")))
    return failure(404, "NOT_FOUND", "Recurso indisponível.");
  if (!settings.internalUrl)
    return failure(
      503,
      "API_UNAVAILABLE",
      "O serviço ainda não está disponível. Tente novamente mais tarde.",
    );
  if (process.env.NODE_ENV === "production" && !settings.publicOrigin)
    return failure(
      503,
      "API_UNAVAILABLE",
      "O serviço ainda não está disponível.",
    );
  let backend: URL;
  try {
    backend = new URL(settings.internalUrl);
    if (
      backend.username ||
      backend.password ||
      backend.search ||
      backend.hash ||
      backend.pathname !== "/"
    )
      throw new Error();
    // This exception is an explicit server setting for the fixed Compose service.
    // Request headers and client input can never choose the upstream destination.
    const composeHttp = settings.allowInternalHttp === "true" &&
      backend.origin === "http://api:3001";
    if (
      backend.protocol !== "https:" &&
      !composeHttp &&
      !(
        process.env.NODE_ENV !== "production" &&
        backend.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(backend.hostname)
      )
    )
      throw new Error();
  } catch {
    return failure(
      503,
      "API_UNAVAILABLE",
      "O serviço ainda não está disponível.",
    );
  }
  let publicOrigin: string;
  try {
    const origin = new URL(settings.publicOrigin || request.url);
    if (
      origin.username ||
      origin.password ||
      !["https:", "http:"].includes(origin.protocol)
    )
      throw new Error();
    publicOrigin = origin.origin;
  } catch {
    return failure(
      503,
      "API_UNAVAILABLE",
      "O serviço ainda não está disponível.",
    );
  }
  if (!safeMethods.has(request.method)) {
    if (
      request.headers.get("origin") !== publicOrigin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return failure(
        403,
        "ORIGIN_DENIED",
        "Recarregue a página antes de tentar novamente.",
      );
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return failure(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Formato de requisição não suportado.",
      );
  }
  const destination = new URL(
    `${group === "auth" ? "/api/auth/" : "/v1/"}${path.join("/")}`,
    backend,
  );
  destination.search = new URL(request.url).search;
  const headers = new Headers();
  for (const key of [
    "accept",
    "content-type",
    "cookie",
    "origin",
    "idempotency-key",
    "if-match",
  ]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  // The API must explicitly trust the public frontend origin, never the internal hostname.
  headers.set("x-forwarded-host", new URL(publicOrigin).host);
  headers.set("x-forwarded-proto", new URL(publicOrigin).protocol.slice(0, -1));
  try {
    let body: Uint8Array | undefined;
    if (!safeMethods.has(request.method)) {
      if (Number(request.headers.get("content-length")) > maxBodyBytes)
        return failure(
          413,
          "BODY_TOO_LARGE",
          "O conteúdo excede o limite permitido.",
        );
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      if (reader)
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > maxBodyBytes) {
            await reader.cancel();
            return failure(
              413,
              "BODY_TOO_LARGE",
              "O conteúdo excede o limite permitido.",
            );
          }
          chunks.push(chunk.value);
        }
      body = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
    }
    const upstream = await fetch(destination, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (upstream.status >= 300 && upstream.status < 400)
      return failure(
        502,
        "UPSTREAM_REDIRECT",
        "Não foi possível concluir esta operação.",
      );
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const key of ["content-type", "retry-after", "etag"]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    const cookies = upstream.headers.getSetCookie();
    // Host-only cookies are required. Fail instead of issuing cookies for an internal domain.
    if (cookies.some((cookie) => /;\s*domain=/i.test(cookie)))
      return failure(
        502,
        "COOKIE_CONFIGURATION",
        "Não foi possível iniciar a sessão.",
      );
    for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return failure(
      503,
      "API_UNAVAILABLE",
      "Não foi possível conectar ao serviço. Seu trabalho permanece nesta tela.",
    );
  }
}
