import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { PrismaClient } from '@prisma/client';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import type { Request, Response, NextFunction } from 'express';
import * as helmet from 'helmet';
import { ZodError } from 'zod';
import { AppModule, type ProductRuntime } from './app.module.js';
import { createAuth } from './auth.js';
import { routes, type Operation } from './contracts.js';
import type { Config } from './config.js';
import { fail, missing } from './errors.js';
import { ProductService } from './product.service.js';
import { budget, digest } from './rate-limit.js';
import type { DraftProvider } from './ai.js';

export async function createApplication(db: PrismaClient, config: Config, provider?: DraftProvider) {
  const runtime: ProductRuntime = { handle: async () => { throw new Error('Runtime not initialized'); } };
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(runtime), { bodyParser: false, logger: false });
  const express = app.getHttpAdapter().getInstance();
  const auth = createAuth(db, config);
  const service = new ProductService(db, config, provider);
  const mapped = Object.entries(routes).map(([name, route]) => ({ name: name as Operation, route,
    names: Array.from(route.path.matchAll(/\{(\w+)\}/g), m => m[1]), regex: new RegExp('^' + route.path.replace(/\{\w+\}/g, '([^/]+)') + '/?$') }));
  function respondError(error: unknown, _req: Request, res: Response) {
    const status = error instanceof HttpException ? error.getStatus() : error instanceof ZodError ? 400 : 500;
    const payload = error instanceof HttpException ? error.getResponse() : null;
    res.status(status).json({ ...(payload && typeof payload === 'object' ? payload : { code: status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR', message: status === 400 ? 'Confira os campos informados.' : 'Não foi possível concluir a operação.' }), requestId: res.locals.requestId });
  }
  app.use(helmet.default());
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.requestId = randomUUID(); res.setHeader('X-Request-Id', res.locals.requestId); res.setHeader('Cache-Control', 'no-store');
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== config.origin) fail(403, 'INVALID_ORIGIN', 'Origem não autorizada.');
      if (!['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method) && !req.is('application/json')) fail(415, 'JSON_REQUIRED', 'Envie dados em JSON.');
      if (Number(req.headers['content-length'] ?? 0) > 65536) fail(413, 'BODY_TOO_LARGE', 'Conteúdo muito grande.');
      // The auth handler consumes the raw stream. Require a bounded length there;
      // the frontend proxy must buffer its small JSON body instead of streaming it.
      if (req.path.startsWith('/api/auth/') && req.method === 'POST' && (!req.headers['content-length'] || req.headers['transfer-encoding'])) {
        fail(411, 'LENGTH_REQUIRED', 'Envie JSON com tamanho definido.');
      }
      next();
    } catch (error) { respondError(error, req, res); }
  });
  express.all('/api/auth/{*path}', async (req: Request, res: Response) => {
    try {
      if (!['/api/auth/sign-in/email', '/api/auth/get-session', '/api/auth/sign-out'].includes(req.path)) return missing();
      if ((req.path !== '/api/auth/get-session' && req.method !== 'POST') || (req.path === '/api/auth/get-session' && req.method !== 'GET')) return missing();
      if (req.path === '/api/auth/sign-in/email') {
        await budget(db, `login-ip:${digest(config.secret + (req.socket.remoteAddress ?? 'unknown'))}`, 20, 60);
        await budget(db, 'login-global', 200, 60);
      }
      await toNodeHandler(auth)(req, res);
    } catch (error) { respondError(error, req, res); }
  });
  app.useBodyParser('json', { limit: '64kb' });
  runtime.handle = async (req, res) => {
    try {
      const match = mapped.find(m => m.route.method.toUpperCase() === req.method && m.regex.test(req.path));
      if (!match) return missing();
      const values = match.regex.exec(req.path)!;
      const params = Object.fromEntries(match.names.map((name, i) => [name, decodeURIComponent(values[i + 1])]));
      if (Object.values(params).some(value => value.length > 100)) return missing();
      let userId = '';
      if (!('public' in match.route && match.route.public === true)) {
        const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
        if (!session) return fail(401, 'UNAUTHENTICATED', 'Entre novamente para continuar.');
        userId = session.user.id;
        await budget(db, `api:${userId}`, 300, 60);
      }
      const body = match.route.body.parse(req.body ?? {});
      const query = match.route.query.parse(req.query);
      const result = await service.execute(match.name, userId, params, body, query);
      const checked = match.route.response.safeParse(JSON.parse(JSON.stringify(result)));
      if (!checked.success) throw new Error('Response contract mismatch');
      res.status(200).json(checked.data);
    } catch (error) { respondError(error, req, res); }
  };
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const tooLarge = error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large';
    respondError(tooLarge ? new HttpException({ code: 'BODY_TOO_LARGE', message: 'Conteúdo muito grande.' }, 413) :
      error instanceof SyntaxError ? new HttpException({ code: 'INVALID_JSON', message: 'JSON inválido.' }, 400) : error, req, res);
  });
  return { app, auth, service };
}
