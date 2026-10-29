import 'reflect-metadata';
// Vercel detects NestJS from a direct framework import in this entrypoint.
import '@nestjs/core';
import { randomUUID } from 'node:crypto';
import type { RequestListener } from 'node:http';
import express from 'express';
import { createApplication } from './runtime.js';
import { db } from './database.js';
import { ConfigurationError, readConfig } from './config.js';

function reportStartupFailure(error: unknown) {
  if (error instanceof ConfigurationError) {
    console.error('Falha na inicialização da API.', {
      code: 'INVALID_ENVIRONMENT', variables: error.variables, hint: error.message,
    });
  } else {
    // Raw errors/stacks can contain connection strings or provider credentials.
    const code = error && typeof error === 'object' && 'code' in error &&
      typeof error.code === 'string' && /^(?:E[A-Z0-9_]+|P[0-9]{4})$/.test(error.code)
      ? error.code : 'API_INITIALIZATION_FAILED';
    console.error('Falha na inicialização da API.', { code });
  }
}

async function initialize() {
  const config = readConfig();
  const { app } = await createApplication(db, config);
  try {
    await app.init();
    const handler: RequestListener = app.getHttpAdapter().getInstance();
    return { app, handler, config };
  } catch (error) {
    await app.close();
    throw error;
  }
}

// One initialization per instance, also when cold-start requests arrive together.
let application: ReturnType<typeof initialize> | undefined;
function getApplication() {
  return application ??= initialize().catch(error => {
    reportStartupFailure(error);
    throw error;
  });
}

// Export an Express server immediately. This also preserves the raw auth stream:
// Vercel recognizes Express and does not install its own body-parsing helpers.
const server = express();
server.disable('x-powered-by');
server.use(async (req, res) => {
  try {
    const application = await getApplication();
    application.handler(req, res);
  } catch {
    const requestId = randomUUID();
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Request-Id': requestId, 'Retry-After': '30' });
    res.end(JSON.stringify({ code: 'API_UNAVAILABLE', message: 'O serviço está temporariamente indisponível.', requestId }));
  }
});
export default server;

// Keep npm run dev:api / npm start working outside the serverless runtime.
if (!process.env.VERCEL) {
  void getApplication().then(async ({ app, config }) => {
    app.enableShutdownHooks();
    await app.listen(config.port, process.env.API_HOST ?? '127.0.0.1');
  }).catch(() => { process.exitCode = 1; });
}
