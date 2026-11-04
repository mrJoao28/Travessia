export const geminiMessages = {
  AI_CREDENTIALS: 'O ChatGPT recusou as credenciais. Reconecte a conta e autorize o uso do plano.',
  AI_MODEL: 'O modelo ChatGPT configurado está indisponível para esta conta. Confira CHATGPT_MODEL.',
  AI_PROVIDER_QUOTA: 'O plano ChatGPT atingiu um limite de uso. Confira o consumo na sua conta.',
  AI_TIMEOUT: 'O ChatGPT demorou demais. Confira o estado do rascunho e tente com menos material.',
  AI_FAILED: 'O ChatGPT não concluiu a geração. Você pode continuar a revisão manualmente.',
} as const;

export function geminiFailure(error: unknown, timedOut = false) {
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
  // Preserve the legacy error code mapping for existing clients.
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
