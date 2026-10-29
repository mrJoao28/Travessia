// Better Auth's HTTP endpoints. No session token is stored in browser storage.
export async function authRequest(
  path: "sign-in/email" | "sign-out" | "get-session",
  body?: unknown,
) {
  const response = await fetch(`/api/auth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        "Não foi possível entrar. Confira suas credenciais e tente novamente.",
      );
    if (response.status === 429)
      throw new Error(
        "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
      );
    throw new Error(
      "O serviço de sessão está indisponível. Tente novamente mais tarde.",
    );
  }
  return response.json() as Promise<unknown>;
}
export function hasSession(value: unknown): boolean {
  if (
    !value ||
    typeof value !== "object" ||
    !("session" in value) ||
    !("user" in value)
  )
    return false;
  const session = value.session;
  const user = value.user;
  return (
    !!session &&
    typeof session === "object" &&
    "id" in session &&
    typeof session.id === "string" &&
    !!user &&
    typeof user === "object" &&
    "id" in user &&
    typeof user.id === "string"
  );
}
