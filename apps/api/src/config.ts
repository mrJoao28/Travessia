import { z } from 'zod';

// Messages and variable names are authored here; never include environment values.
export class ConfigurationError extends Error {
  readonly variables: string[];
  constructor(variables: string[], message: string) {
    super(message);
    this.name = 'ConfigurationError';
    this.variables = variables;
  }
}

function value<T>(schema: z.ZodType<T>, env: NodeJS.ProcessEnv, name: string): T {
  const parsed = schema.safeParse(env[name]);
  if (!parsed.success) throw new ConfigurationError([name], 'Variável ausente ou inválida.');
  return parsed.data;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const origin = value(z.url(), env, 'TRUSTED_WEB_ORIGIN');
  const baseURL = value(z.url(), env, 'BETTER_AUTH_URL');
  for (const [name, address] of [['TRUSTED_WEB_ORIGIN', origin], ['BETTER_AUTH_URL', baseURL]]) {
    const url = new URL(address);
    if (url.origin !== address || !['http:', 'https:'].includes(url.protocol) ||
      (env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
      throw new ConfigurationError([name], 'Use somente a origem pública, sem caminho ou barra final; produção exige HTTPS.');
    }
  }
  if (origin !== baseURL) throw new ConfigurationError(['BETTER_AUTH_URL', 'TRUSTED_WEB_ORIGIN'], 'As duas variáveis devem usar a mesma origem pública do frontend.');
  const secret = value(z.string().min(32), env, 'BETTER_AUTH_SECRET');
  if (new Set(secret).size < 12) throw new ConfigurationError(['BETTER_AUTH_SECRET'], 'Use um segredo aleatório com pelo menos 32 caracteres.');
  if ((env.DEMO_MODE === 'true') !== (env.DEMO_ONLY === 'true')) throw new ConfigurationError(['DEMO_MODE', 'DEMO_ONLY'], 'Demo exige os dois indicadores de isolamento.');
  const demo = env.DEMO_MODE === 'true' && env.DEMO_ONLY === 'true';
  const databaseURL = value(z.string().url(), env, 'DATABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseURL).protocol)) throw new ConfigurationError(['DATABASE_URL'], 'Use uma conexão PostgreSQL.');
  const schema = new URL(databaseURL).searchParams.get('schema') ?? 'public';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema) || schema === 'public') throw new ConfigurationError(['DATABASE_URL'], 'Configure um schema privado; a demonstração usa schema=travessia.');
  const aiEnabled = env.AI_ENABLED === 'true';
  if (aiEnabled && (!env.GEMINI_API_KEY || !env.GEMINI_MODEL)) throw new ConfigurationError(['GEMINI_API_KEY', 'GEMINI_MODEL'], 'Gemini não configurado.');
  if (aiEnabled && !demo && env.GEMINI_PUBLIC_USE_APPROVED !== 'true') throw new ConfigurationError(['GEMINI_PUBLIC_USE_APPROVED'], 'Validar termos e público antes de ativar IA.');
  const portName = env.PORT === undefined ? 'API_PORT' : 'PORT';
  const port = value(z.coerce.number().int().min(0).max(65535), { [portName]: env[portName] ?? '3001' }, portName);
  return { origin, baseURL, secret, demo, aiEnabled, model: env.GEMINI_MODEL ?? 'disabled',
    geminiKey: env.GEMINI_API_KEY, production: env.NODE_ENV === 'production',
    storageURL: env.SUPABASE_URL, storageKey: env.SUPABASE_STORAGE_SECRET,
    port };
}
export type Config = ReturnType<typeof readConfig>;
