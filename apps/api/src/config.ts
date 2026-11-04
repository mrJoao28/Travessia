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
  // Production images can be tested on loopback without changing NODE_ENV.
  // Public domains always require HTTPS, even when this local opt-in is set.
  const localHttp = env.ALLOW_LOCAL_HTTP === 'true' &&
    new URL(origin).protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
  for (const [name, address] of [['TRUSTED_WEB_ORIGIN', origin], ['BETTER_AUTH_URL', baseURL]]) {
    const url = new URL(address);
    if (url.origin !== address || !['http:', 'https:'].includes(url.protocol) ||
      (env.NODE_ENV === 'production' && url.protocol !== 'https:' && !localHttp)) {
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
  if (aiEnabled && (!demo || env.NODE_ENV === 'production' || env.VERCEL ||
      !['127.0.0.1', 'localhost'].includes(new URL(origin).hostname) ||
      !['127.0.0.1', 'localhost'].includes(new URL(databaseURL).hostname) ||
      (env.API_HOST && env.API_HOST !== '127.0.0.1'))) {
    throw new ConfigurationError(['AI_ENABLED'], 'ChatGPT disponível somente para a demonstração local, com API e banco em loopback.');
  }
  if (aiEnabled && !env.CHATGPT_MODEL?.trim()) throw new ConfigurationError(['CHATGPT_MODEL'], 'Configure um modelo disponível no seu plano.');
  const portName = env.PORT === undefined ? 'API_PORT' : 'PORT';
  const port = value(z.coerce.number().int().min(0).max(65535), { [portName]: env[portName] ?? '3001' }, portName);
  return { origin, baseURL, secret, demo, aiEnabled, model: env.CHATGPT_MODEL?.trim() ?? 'disabled',
    production: env.NODE_ENV === 'production',
    secureCookies: new URL(origin).protocol === 'https:',
    storageURL: env.SUPABASE_URL, storageKey: env.SUPABASE_STORAGE_SECRET,
    port };
}
export type Config = ReturnType<typeof readConfig>;
