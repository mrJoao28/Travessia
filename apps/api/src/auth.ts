import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '@prisma/client';
import type { Config } from './config.js';

export function createAuth(db: PrismaClient, config: Config) {
  return betterAuth({
    appName: 'Travessia', baseURL: config.baseURL, basePath: '/api/auth',
    secret: config.secret, database: prismaAdapter(db, { provider: 'postgresql' }),
    trustedOrigins: [config.origin],
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: config.demo ? 5 : 12, maxPasswordLength: 128 },
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
