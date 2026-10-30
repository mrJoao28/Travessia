import assert from 'node:assert/strict';
import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

// Upgrade an actual pre-profile database, rather than only testing a clean install.
// Called exclusively by the isolated PostgreSQL runner, before its HTTP suite.
export async function verifyProfileMigration(directory: string, run: (file: string, args: string[]) => Promise<void>) {
  const original = { DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL };
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('schema', 'legacy_profile_upgrade');
  process.env.DATABASE_URL = url.href; process.env.DIRECT_URL = url.href;
  const db = new PrismaClient({ datasourceUrl: url.href, log: [] });
  try {
    const baseline = join(directory, 'legacy-schema');
    mkdirSync(join(baseline, 'migrations'), { recursive: true });
    cpSync('apps/api/prisma/schema.prisma', join(baseline, 'schema.prisma'));
    cpSync('apps/api/prisma/migrations/migration_lock.toml', join(baseline, 'migrations/migration_lock.toml'));
    for (const name of ['202610280001_initial', '202610280002_deny_direct_access'])
      cpSync(join('apps/api/prisma/migrations', name), join(baseline, 'migrations', name), { recursive: true });
    await run('node_modules/prisma/build/index.js', ['migrate', 'deploy', '--schema', join(baseline, 'schema.prisma')]);
    await db.$executeRaw`INSERT INTO "User" (id, name, email, "updatedAt") VALUES ('legacy-person', 'Pessoa anterior', 'legacy@example.invalid', CURRENT_TIMESTAMP)`;
    // Preserve a long legacy course too: the old column had no maximum length.
    const course = 'Curso anterior — ' + 'A'.repeat(160);
    await db.$executeRaw`INSERT INTO "Profile" ("userId", course) VALUES ('legacy-person', ${course})`;
    await db.$executeRaw`INSERT INTO "Account" (id, "accountId", "providerId", "userId", password, "updatedAt") VALUES ('legacy-account', 'legacy-person', 'credential', 'legacy-person', 'fixture-hash-unchanged', CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "Session" (id, "userId", token, "expiresAt", "updatedAt") VALUES ('legacy-session', 'legacy-person', 'fixture-token-unchanged', CURRENT_TIMESTAMP + interval '1 day', CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "Classroom" (id, name) VALUES ('legacy-class-student', 'Turma anterior'), ('legacy-class-teacher', 'Docência anterior')`;
    await db.$executeRaw`INSERT INTO "Membership" (id, "userId", "classroomId", role) VALUES ('legacy-member-student', 'legacy-person', 'legacy-class-student', 'student'), ('legacy-member-teacher', 'legacy-person', 'legacy-class-teacher', 'teacher')`;
    await run('node_modules/prisma/build/index.js', ['migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma']);
    assert.equal((await db.studentProfile.findUniqueOrThrow({ where: { userId: 'legacy-person' } })).course, course);
    assert.ok(await db.teacherProfile.findUnique({ where: { userId: 'legacy-person' } }));
    assert.equal((await db.profile.findUniqueOrThrow({ where: { userId: 'legacy-person' } })).phone, null);
    assert.equal((await db.account.findUniqueOrThrow({ where: { id: 'legacy-account' } })).password, 'fixture-hash-unchanged');
    assert.equal((await db.session.findUniqueOrThrow({ where: { id: 'legacy-session' } })).token, 'fixture-token-unchanged');
    assert.equal(await db.membership.count({ where: { userId: 'legacy-person', active: true } }), 2);
    const tables = await db.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'legacy_profile_upgrade' AND tablename IN ('StudentProfile', 'TeacherProfile', 'TeachingAssignment', 'StrategyPlan', 'StrategyItem', 'StrategyRecipient')`;
    assert.equal(tables.length, 6); assert.ok(tables.every(table => table.rowsecurity));
    console.log('Upgrade de perfis confirmado: curso, conta, sessão e vínculos preservados; novas tabelas privadas.');
  } finally {
    await db.$disconnect(); Object.assign(process.env, original);
  }
}
