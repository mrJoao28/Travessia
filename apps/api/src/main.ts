import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const url = new URL(origin);
  if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('WEB_ORIGIN precisa ser uma origem HTTP(S) sem caminho.');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('WEB_ORIGIN precisa usar HTTPS em produção.');
  }
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT inválida.');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '256kb' });
  app.use(helmet());
  app.setGlobalPrefix('v1');
  app.enableCors({ origin, credentials: true, methods: ['GET'] });
  app.enableShutdownHooks();
  await app.listen(port, process.env.API_HOST ?? (process.env.VERCEL ? '0.0.0.0' : '127.0.0.1'));
}

bootstrap().catch(() => {
  console.error('Falha na inicialização da API. Confira a configuração do ambiente.');
  process.exitCode = 1;
});
