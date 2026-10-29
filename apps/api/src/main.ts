import 'reflect-metadata';
// Vercel detects NestJS from a direct framework import in this entrypoint.
import '@nestjs/core';
import { createApplication } from './runtime.js';
import { db } from './database.js';
import { readConfig } from './config.js';

async function bootstrap() {
  const config = readConfig();
  const { app } = await createApplication(db, config);
  app.enableShutdownHooks();
  await app.listen(config.port, process.env.API_HOST ?? (process.env.VERCEL ? '0.0.0.0' : '127.0.0.1'));
}

bootstrap().catch(() => {
  console.error('Falha na inicialização da API. Confira a configuração do ambiente.');
  process.exitCode = 1;
});
