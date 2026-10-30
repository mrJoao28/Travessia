import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../apps/api/src/config.ts';

const fixture = {
  NODE_ENV: 'production',
  TRUSTED_WEB_ORIGIN: 'https://travessia.example.invalid',
  BETTER_AUTH_URL: 'https://travessia.example.invalid',
  BETTER_AUTH_SECRET: 'fictional-container-test-secret-8237419-ABCxyz',
  DATABASE_URL: 'postgresql://fixture:fixture@db:5432/fixture?schema=travessia',
};
function origin(url: string) { return { TRUSTED_WEB_ORIGIN: url, BETTER_AUTH_URL: url }; }

test('imagem de produção permite HTTP local somente com opção explícita', () => {
  const local = { ...fixture, ...origin('http://localhost:3000') };
  assert.throws(() => readConfig(local));
  for (const address of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
    const config = readConfig({ ...fixture, ...origin(address), ALLOW_LOCAL_HTTP: 'true' });
    assert.equal(config.production, true);
    assert.equal(config.secureCookies, false);
  }
});
test('opção de localhost não libera HTTP de domínio público ou host semelhante', () => {
  for (const address of ['http://travessia.example.invalid', 'http://localhost.example.invalid', 'http://0.0.0.0:3000']) {
    assert.throws(() => readConfig({ ...fixture, ...origin(address), ALLOW_LOCAL_HTTP: 'true' }));
  }
});
test('HTTPS mantém cookies Secure inclusive com opção local ativada', () => {
  assert.equal(readConfig(fixture).secureCookies, true);
  assert.equal(readConfig({ ...fixture, ALLOW_LOCAL_HTTP: 'true' }).secureCookies, true);
});
test('opção local preserva validações de origem, segredo e schema privado', () => {
  const local = { ...fixture, ...origin('http://localhost:3000'), ALLOW_LOCAL_HTTP: 'true' };
  assert.throws(() => readConfig({ ...local, BETTER_AUTH_URL: 'http://127.0.0.1:3000' }));
  assert.throws(() => readConfig({ ...local, BETTER_AUTH_SECRET: 'weak' }));
  assert.throws(() => readConfig({ ...local, DATABASE_URL: fixture.DATABASE_URL.replace('travessia', 'public') }));
  assert.throws(() => readConfig({ ...local, ...origin('http://localhost:3000/path') }));
  assert.equal(readConfig(local).demo, false);
});
