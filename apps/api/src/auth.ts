import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '@prisma/client';
import type { Config } from './config.js';

export function createAuth(db: PrismaClient, config: Config) {
  return betterAuth({
    appName: 'Travessia', baseURL: config.baseURL, basePath: '/api/auth',
    secret: config.secret, database: prismaAdapter(db, { provider: 'postgresql' }),
    trustedOrigins: [config.origin],
    emailAndPassword: { enabled: true, disableSignUp: false, autoSignIn: true, minPasswordLength: 12, maxPasswordLength: 128 },
    hooks: { before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return;
      const raw = ctx.body && typeof ctx.body === 'object' && 'name' in ctx.body ? ctx.body.name : '';
      const name = typeof raw === 'string' ? raw.trim() : '';
      if (name.length < 2 || name.length > 80) throw APIError.from('BAD_REQUEST', { message: 'Informe seu nome.', code: 'INVALID_NAME' });
      if (ctx.body && typeof ctx.body === 'object') ctx.body.name = name;
    }) },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    advanced: { useSecureCookies: config.secureCookies,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      database: { generateId: () => crypto.randomUUID() } },
    // Atomic, persistent request budgets are applied before this handler (runtime.ts).
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
}
export type Auth = ReturnType<typeof createAuth>;
