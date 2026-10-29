import { z } from 'zod';

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const origin = z.url().parse(env.TRUSTED_WEB_ORIGIN);
  const baseURL = z.url().parse(env.BETTER_AUTH_URL);
  for (const value of [origin, baseURL]) {
    const url = new URL(value);
    if (url.origin !== value || !['http:', 'https:'].includes(url.protocol) ||
      (env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('Origem auth inválida.');
  }
  if (origin !== baseURL) throw new Error('Auth deve usar a origem pública do frontend.');
  const secret = z.string().min(32).parse(env.BETTER_AUTH_SECRET);
  if (new Set(secret).size < 12) throw new Error('Segredo auth inadequado.');
  if ((env.DEMO_MODE === 'true') !== (env.DEMO_ONLY === 'true')) throw new Error('Demo exige os dois indicadores de isolamento.');
  const demo = env.DEMO_MODE === 'true' && env.DEMO_ONLY === 'true';
  const databaseURL = z.string().url().parse(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseURL).protocol)) throw new Error('PostgreSQL obrigatório.');
  const schema = new URL(databaseURL).searchParams.get('schema') ?? 'public';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema) || schema === 'public') throw new Error('Configure schema privado no PostgreSQL.');
  const aiEnabled = env.AI_ENABLED === 'true';
  if (aiEnabled && (!env.GEMINI_API_KEY || !env.GEMINI_MODEL)) throw new Error('Gemini não configurado.');
  if (aiEnabled && !demo && env.GEMINI_PUBLIC_USE_APPROVED !== 'true') throw new Error('Validar termos e público antes de ativar IA.');
  return { origin, baseURL, secret, demo, aiEnabled, model: env.GEMINI_MODEL ?? 'disabled',
    geminiKey: env.GEMINI_API_KEY, production: env.NODE_ENV === 'production',
    storageURL: env.SUPABASE_URL, storageKey: env.SUPABASE_STORAGE_SECRET,
    port: z.coerce.number().int().min(0).max(65535).parse(env.PORT ?? env.API_PORT ?? 3001) };
}
export type Config = ReturnType<typeof readConfig>;
