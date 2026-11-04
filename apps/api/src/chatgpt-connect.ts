import { createServer } from 'node:http';
import { startAuthorization, finishAuthorization, listChatGPTModels } from './chatgpt-local.js';

const origin = 'http://127.0.0.1:1455';
const callback = origin + '/auth/callback';
let pending: Awaited<ReturnType<typeof startAuthorization>> | undefined;
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (request.headers.host !== '127.0.0.1:1455') return response.writeHead(400).end();
  const url = new URL(request.url ?? '/', origin);
  try {
    if (request.method === 'GET' && url.pathname === '/') {
      return response.end('<html lang="pt-BR"><title>Travessia Local</title><h1>Travessia Local</h1><form method="post" action="/connect"><button>Continue with ChatGPT</button></form></html>');
    }
    if (request.method === 'GET' && url.pathname === '/models') {
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return response.end((await listChatGPTModels()).join('\n'));
    }
    if (request.method === 'POST' && url.pathname === '/connect' && request.headers.origin === origin) {
      pending = await startAuthorization(callback);
      return response.writeHead(303, { Location: pending.url.href }).end();
    }
    if (request.method === 'GET' && url.pathname === '/auth/callback' && pending && url.searchParams.get('state') === pending.state) {
      const attempt = pending;
      pending = undefined;
      await finishAuthorization(attempt, url.searchParams);
      return response.end('<h1>ChatGPT conectado ao Travessia Local</h1><p><a href="/models">Ver modelos disponíveis</a> para configurar CHATGPT_MODEL.</p>');
    }
    return response.writeHead(404).end();
  } catch {
    return response.writeHead(400).end('<h1>Conexão não concluída</h1><p>Confira se você autorizou o uso do plano e <a href="/">tente novamente</a>.</p>');
  }
});
server.listen(1455, '127.0.0.1', () => console.log('Abra ' + origin + ' para conectar sua conta ChatGPT.'));
