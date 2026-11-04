export const geminiMessages = {
  AI_CREDENTIALS: 'O Gemini recusou as credenciais. Peça ao responsável pelo servidor para conferir a chave e as permissões.',
  AI_MODEL: 'O modelo Gemini configurado está indisponível para este projeto. Peça ao responsável pelo servidor para conferir o modelo.',
  AI_PROVIDER_QUOTA: 'O projeto Gemini atingiu um limite de uso. Aguarde ou peça ao responsável pelo servidor para conferir a cota.',
  AI_TIMEOUT: 'O Gemini demorou demais. Confira o estado do rascunho e tente com menos material.',
  AI_FAILED: 'O Gemini não concluiu a geração. Você pode continuar a revisão manualmente.',
} as const;

export function geminiFailure(error: unknown, timedOut = false) {
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
  // Gemini can report invalid keys as HTTP 400 with ErrorInfo details.
  const invalidKey = status === 400 && error instanceof Error && /API_KEY_INVALID|API_KEY_SERVICE_BLOCKED/.test(error.message);
  const name = error instanceof Error ? error.name : '';
  const code = timedOut || name === 'AbortError' || name === 'TimeoutError' || status === 504
    ? 'AI_TIMEOUT'
    : status === 429
      ? 'AI_PROVIDER_QUOTA'
      : invalidKey || status === 401 || status === 403
        ? 'AI_CREDENTIALS'
        : status === 404
          ? 'AI_MODEL'
          : 'AI_FAILED';
  return { code, message: geminiMessages[code], status: code === 'AI_TIMEOUT' ? 504 : code === 'AI_PROVIDER_QUOTA' ? 429 : 502 };
}
