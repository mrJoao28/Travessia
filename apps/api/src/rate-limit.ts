import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { fail } from './errors.js';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function budget(db: PrismaClient, key: string, limit: number, seconds: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + seconds * 1000);
  const hashed = digest(key);
  const schema = new URL(process.env.DATABASE_URL!).searchParams.get('schema') ?? '';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Schema inválido.');
  // Fixed, validated server configuration, never a client-provided SQL identifier.
  const table = Prisma.raw(`"${schema}"."RateBucket"`);
  const rows = await db.$queryRaw<{count: number}[]>`
    INSERT INTO ${table} AS bucket ("key", "count", "expiresAt") VALUES (${hashed}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN bucket."expiresAt" <= ${now} THEN 1 ELSE bucket."count" + 1 END,
      "expiresAt" = CASE WHEN bucket."expiresAt" <= ${now} THEN ${expiresAt} ELSE bucket."expiresAt" END
    RETURNING "count"`;
  if (rows[0].count > limit) fail(429, 'RATE_LIMITED', 'Limite temporário atingido. Tente mais tarde.');
}
