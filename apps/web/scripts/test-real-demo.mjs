import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { createServer } from "node:net";

// Run after integrating the backend implementation and its dependencies:
// tsx --tsconfig apps/api/tsconfig.json apps/web/scripts/test-real-demo.mjs
// This runner never uses a supplied database URL or personal demo credentials.
const root = resolve(import.meta.dirname, "../../..");
const initialEnv = { ...process.env };
const directory = resolve(root, "apps/web/.next/e2e-db", `run-${Date.now()}`);
mkdirSync(directory, { recursive: true });
const password = randomBytes(24).toString("hex");
const databaseDir = join(directory, "data");
const passwordFile = join(directory, "test-password");
writeFileSync(passwordFile, password, { mode: 0o600 });
async function freePort() {
  const server = createServer();
  await new Promise((yes, no) => {
    server.once("error", no);
    server.listen(0, "127.0.0.1", yes);
  });
  const port = server.address().port;
  await new Promise((yes, no) =>
    server.close((error) => (error ? no(error) : yes())),
  );
  return port;
}
async function execute(file, args, options = {}) {
  await new Promise((yes, no) => {
    const child = spawn(file, args, {
      cwd: root,
      windowsHide: true,
      stdio: "ignore",
      ...options,
    });
    child.once("error", no);
    child.once("exit", (code) =>
      code === 0 ? yes() : no(new Error("Command failed.")),
    );
  });
}
let native;
let started = false;
let runtime;
let db;
let web;
let phase = "gerar cliente Prisma";
try {
  await execute(process.execPath, [
    "node_modules/prisma/build/index.js",
    "generate",
    "--schema",
    "apps/api/prisma/schema.prisma",
  ]);
  const { PrismaClient } = await import("@prisma/client");
  const platform = process.platform === "win32" ? "windows" : process.platform;
  native = await import(`@embedded-postgres/${platform}-${process.arch}`);
  const databasePort = await freePort();
  const webPort = await freePort();
  const publicOrigin = `http://127.0.0.1:${webPort}`;
  phase = "inicializar PostgreSQL de teste";
  console.log("Preparando PostgreSQL isolado para o navegador.");
  await execute(native.initdb, [
    "-D",
    databaseDir,
    "-U",
    "postgres",
    "--pwfile",
    passwordFile,
    "-A",
    "scram-sha-256",
    "--locale=C",
    "--encoding=UTF8",
  ]);
  await execute(native.pg_ctl, [
    "-D",
    databaseDir,
    "-l",
    join(directory, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${databasePort}`,
    "-w",
    "-t",
    "30",
    "start",
  ]);
  started = true;
  const admin = new PrismaClient({
    datasourceUrl: `postgresql://postgres:${password}@127.0.0.1:${databasePort}/postgres`,
    log: [],
  });
  try {
    await admin.$executeRawUnsafe('CREATE DATABASE "travessia_browser"');
  } finally {
    await admin.$disconnect();
  }
  process.env.DATABASE_URL = `postgresql://postgres:${password}@127.0.0.1:${databasePort}/travessia_browser?schema=travessia`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  process.env.DEMO_DATABASE_NAME = "travessia_browser";
  process.env.DEMO_MODE = "true";
  process.env.DEMO_ONLY = "true";
  process.env.NODE_ENV = "test";
  process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("base64");
  process.env.BETTER_AUTH_URL = publicOrigin;
  process.env.TRUSTED_WEB_ORIGIN = publicOrigin;
  process.env.DEMO_USER_EMAIL = `browser-${randomBytes(6).toString("hex")}@example.invalid`;
  process.env.DEMO_USER_PASSWORD = randomBytes(18).toString("hex");
  process.env.AI_ENABLED = "false";
  phase = "aplicar migrations";
  await execute(process.execPath, [
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
    "--schema",
    "apps/api/prisma/schema.prisma",
  ]);
  const { readConfig } = await import("../../api/src/config.ts");
  const { seedDemo } = await import("../../api/src/seed.ts");
  const { createApplication } = await import("../../api/src/runtime.ts");
  db = new PrismaClient({ log: [] });
  const config = readConfig();
  phase = "executar seed real de teste";
  await seedDemo(db, config);
  phase = "iniciar API real";
  runtime = await createApplication(db, config);
  await runtime.app.listen(0, "127.0.0.1");
  const webEnv = {
    ...initialEnv,
    NODE_ENV: "development",
    API_INTERNAL_URL: await runtime.app.getUrl(),
    WEB_PUBLIC_ORIGIN: publicOrigin,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  for (const key of [
    "DATABASE_URL",
    "DIRECT_URL",
    "BETTER_AUTH_SECRET",
    "DEMO_USER_EMAIL",
    "DEMO_USER_PASSWORD",
    "GEMINI_API_KEY",
    "SUPABASE_STORAGE_SECRET",
  ])
    delete webEnv[key];
  phase = "iniciar Next.js com proxy real";
  console.log("API e seed de teste iniciados. Abrindo Next.js.");
  web = spawn(
    process.execPath,
    [
      resolve(root, "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(webPort),
    ],
    {
      cwd: resolve(root, "apps/web"),
      windowsHide: true,
      stdio: "ignore",
      env: webEnv,
    },
  );
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (web.exitCode !== null) throw new Error("Next.js stopped.");
    try {
      if (
        (
          await fetch(`${publicOrigin}/login`, {
            signal: AbortSignal.timeout(2000),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {
      /* Startup has a bounded retry budget. */
    }
    await new Promise((yes) => setTimeout(yes, 500));
  }
  if (!ready) throw new Error("Next.js unavailable.");
  phase = "testar demonstração integrada";
  console.log(
    "Executando navegador com API, Better Auth, migrations e seed reais de teste.",
  );
  process.env.TRAVESSIA_WEB_TEST_URL = publicOrigin;
  await execute(
    process.execPath,
    [
      "node_modules/playwright/cli.js",
      "test",
      "--config",
      "apps/web/playwright.real.config.ts",
    ],
    { env: process.env, stdio: "inherit" },
  );
} catch {
  console.error(
    `Integração web falhou na etapa: ${phase}. Nenhuma credencial foi impressa.`,
  );
  process.exitCode = 1;
} finally {
  if (web?.pid && web.exitCode === null) {
    if (process.platform === "win32")
      await execute("C:/Windows/System32/taskkill.exe", [
        "/PID",
        String(web.pid),
        "/T",
        "/F",
      ]).catch(() => {});
    else web.kill("SIGTERM");
  }
  await runtime?.app.close();
  await db?.$disconnect();
  if (started)
    await execute(native.pg_ctl, [
      "-D",
      databaseDir,
      "-m",
      "fast",
      "-w",
      "-t",
      "10",
      "stop",
    ]);
}
