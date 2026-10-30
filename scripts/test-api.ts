import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';

// Native PostgreSQL, never SQLite/in-memory adapter. A new database per run.
const directory = resolve('.test-db', `run-${Date.now()}`);
mkdirSync(directory, { recursive: true });
const password = randomBytes(24).toString('hex');
const getPort = createServer();
await new Promise<void>(resolvePort => getPort.listen(0, '127.0.0.1', resolvePort));
const port = (getPort.address() as {port: number}).port;
await new Promise<void>((resolvePort, reject) => getPort.close(error => error ? reject(error) : resolvePort()));
const platform = process.platform === 'win32' ? 'windows' : process.platform;
const native = await import(`@embedded-postgres/${platform}-${process.arch}`) as {initdb: string; pg_ctl: string};
async function execute(file: string, args: string[], options: {windowsHide?: boolean; env?: NodeJS.ProcessEnv} = {}) {
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn(file, args, { stdio: 'ignore', windowsHide: true, env: options.env ?? process.env });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolveRun() : reject(new Error('PostgreSQL command failed.')));
  });
}
let started = false;
let phase = 'inicializar PostgreSQL';
const passwordFile = join(directory, 'test-password');
const databaseDir = join(directory, 'data');
writeFileSync(passwordFile, password, { mode: 0o600 });
async function run(file: string, args: string[]) {
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn(process.execPath, [file, ...args], { stdio: 'inherit', env: process.env });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolveRun() : reject(new Error('Verificação falhou.')));
  });
}
try {
  phase = 'gerar Prisma Client';
  await run('node_modules/prisma/build/index.js', ['generate', '--schema', 'apps/api/prisma/schema.prisma']);
  const { PrismaClient } = await import('@prisma/client');
  phase = 'inicializar PostgreSQL';
  await execute(native.initdb, ['-D', databaseDir, '-U', 'postgres', '--pwfile', passwordFile, '-A', 'scram-sha-256', '--locale=C', '--encoding=UTF8'], { windowsHide: true });
  phase = 'iniciar PostgreSQL';
  await execute(native.pg_ctl, ['-D', databaseDir, '-l', join(directory, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', '-t', '30', 'start'], { windowsHide: true });
  started = true;
  phase = 'criar banco isolado';
  const admin = new PrismaClient({ datasourceUrl: `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`, log: [] });
  try { await admin.$executeRawUnsafe('CREATE DATABASE "travessia_test"'); }
  finally { await admin.$disconnect(); }
  process.env.DATABASE_URL = `postgresql://postgres:${password}@127.0.0.1:${port}/travessia_test?schema=travessia`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  process.env.DEMO_DATABASE_NAME = 'travessia_test';
  process.env.DEMO_MODE = 'true'; process.env.DEMO_ONLY = 'true'; process.env.NODE_ENV = 'test';
  process.env.BETTER_AUTH_SECRET = randomBytes(32).toString('base64');
  process.env.BETTER_AUTH_URL = 'http://localhost:3000'; process.env.TRUSTED_WEB_ORIGIN = 'http://localhost:3000';
  process.env.DEMO_USER_EMAIL = 'principal@example.invalid'; process.env.DEMO_USER_PASSWORD = randomBytes(3).toString('hex').slice(0, 5);
  process.env.AI_ENABLED = 'false';
  phase = 'verificar atualização do schema anterior sem perda de dados';
  const { verifyProfileMigration } = await import('./test-profile-migration.js');
  await verifyProfileMigration(directory, run);
  phase = 'aplicar migrations';
  await run('node_modules/prisma/build/index.js', ['migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma']);
  phase = 'executar testes HTTP';
  await run('node_modules/tsx/dist/cli.mjs', ['--tsconfig', 'apps/api/tsconfig.json', '--test', 'apps/api/tests/http.test.ts', 'apps/api/tests/entrypoint.test.ts']);
} catch {
  console.error(`Testes API falharam na etapa: ${phase}. Confira a saída anterior.`); process.exitCode = 1;
} finally {
  if (started) await execute(native.pg_ctl, ['-D', databaseDir, '-m', 'fast', '-w', '-t', '10', 'stop'], { windowsHide: true });
}
