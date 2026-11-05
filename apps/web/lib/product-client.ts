import { PDF_EDIT_BODY_BYTES, PDF_UPLOAD_BODY_BYTES } from "./material-limits.ts";
import {
  apiRoutes,
  type ApiOperations,
  type ApiResponse,
} from "./api.generated";
export { type ApiResponse, type ApiBody } from "./api.generated";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<K extends keyof ApiOperations>(
  operation: K,
  options: {
    params?: ApiOperations[K]["params"];
    body?: ApiOperations[K]["body"];
    cursor?: string;
    query?: ApiOperations[K]["query"];
    signal?: AbortSignal;
  } = {},
): Promise<ApiResponse<K>> {
  const serialized =
    options.body === undefined ? undefined : JSON.stringify(options.body);
  const maxBytes = operation === "uploadMaterialSource" ? PDF_UPLOAD_BODY_BYTES : operation === "editMaterial" ? PDF_EDIT_BODY_BYTES : ["createStrategyPlan", "updateStrategyPlan", "saveSubmission"].includes(operation) ? 2 * 1024 * 1024 : 64 * 1024;
  if (serialized && new TextEncoder().encode(serialized).byteLength > maxBytes)
    throw new ApiError(
      413,
      "BODY_TOO_LARGE",
      "O conteúdo excede o limite da operação. Reduza o conteúdo antes de enviar. Seu texto permanece nesta tela.",
    );
  const route = apiRoutes[operation];
  const path = route.path.replace(/\{(\w+)\}/g, (_, key) =>
    encodeURIComponent(
      (options.params as Record<string, string> | undefined)?.[key] ?? "",
    ),
  );
  const url = new URL(`/api/v1${path}`, window.location.origin);
  if (options.cursor) url.searchParams.set("cursor", options.cursor);
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }
  const response = await fetch(url, {
    method: route.method,
    credentials: "same-origin",
    cache: "no-store",
    ...(!["GET", "HEAD"].includes(route.method)
      ? { headers: { "Content-Type": "application/json" } }
      : {}),
    ...(options.body === undefined
      ? {}
      : {
          body: serialized,
          headers: { "Content-Type": "application/json" },
        }),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(35_000)])
      : AbortSignal.timeout(35_000),
  }).catch((reason: unknown) => {
    if (reason instanceof Error && reason.name === "TimeoutError")
      throw new ApiError(
        504,
        "TIMEOUT",
        "O tempo de resposta foi excedido. Seu texto permanece nesta tela. Consulte o estado da operação antes de solicitar novamente.",
      );
    throw new ApiError(
      503,
      "NETWORK_ERROR",
      "Não foi possível conectar. Seu texto permanece nesta tela. Tente novamente.",
    );
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "REQUEST_FAILED";
    const geminiErrors: Record<string, string> = {
      AI_CREDENTIALS: "Reconecte sua conta ChatGPT e autorize o uso do plano.",
      AI_MODEL: "O modelo ChatGPT está indisponível para esta conta. Confira CHATGPT_MODEL.",
      AI_PROVIDER_QUOTA: "O plano ChatGPT atingiu um limite de uso. Confira o consumo na sua conta.",
      AI_TIMEOUT: "O ChatGPT demorou demais. Confira o estado do rascunho antes de tentar com menos material.",
    };
    const message = Object.hasOwn(geminiErrors, code) ? geminiErrors[code] :
      response.status === 401
        ? "Sua sessão expirou. Entre novamente para salvar. Seu texto permanece nesta tela."
        : response.status === 409
          ? "O conteúdo mudou no servidor. Preserve seu texto e consulte a versão atual antes de tentar novamente."
          : response.status === 429
            ? "O limite de solicitações foi atingido. Aguarde antes de tentar novamente."
            : code === "AI_FAILED"
              ? "Não foi possível gerar o rascunho. Seu planejamento foi preservado e você pode continuar manualmente."
              : code === "INPUT_TOO_LARGE"
                ? "Os materiais selecionados excedem o limite da assistência. Selecione menos conteúdo e tente novamente."
                : code === "AI_UNAVAILABLE"
                  ? "A assistência está desligada nesta instância. Inicie a API local com AI_ENABLED=true e confira CHATGPT_MODEL. Você também pode continuar manualmente."
                  : response.status === 404 || response.status === 403
                    ? "Este recurso não está disponível para seu vínculo atual."
                    : "Não foi possível concluir a operação. Confira os campos e tente novamente. Seu texto foi preservado.";
    throw new ApiError(response.status, code, message);
  }
  return response.json() as Promise<ApiResponse<K>>;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

export async function pages<
  K extends "classrooms" | "missions" | "submissions" | "barriers" | "members" | "invitations" | "strategyRecipients" | "sharedLearningNeeds",
>(operation: K, id?: string) {
  const items: Array<ApiResponse<K>["items"][number]> = [];
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const params = (id ? { id } : {}) as ApiOperations[K]["params"];
    const response = await api(operation, { params, cursor });
    items.push(...(response.items as Array<ApiResponse<K>["items"][number]>));
    if (!response.nextCursor) return items as ApiResponse<K>["items"];
    if (cursor === response.nextCursor)
      throw new Error("Não foi possível carregar a próxima página.");
    cursor = response.nextCursor;
  }
  throw new Error("A lista excede o limite desta visualização.");
}
