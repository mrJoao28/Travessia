import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = resolve(root, '.env.docker');
const password = randomBytes(24).toString('hex');
const replacements = {
  POSTGRES_PASSWORD: password,
  DATABASE_URL: `postgresql://travessia:${password}@db:5432/travessia?schema=travessia&connection_limit=5&pool_timeout=10`,
  BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'),
  DEMO_USER_PASSWORD: randomBytes(18).toString('base64url'),
};
const template = await readFile(resolve(root, '.env.docker.example'), 'utf8');
const content = template.replace(/^(POSTGRES_PASSWORD|DATABASE_URL|BETTER_AUTH_SECRET|DEMO_USER_PASSWORD)=.*$/gm,
  (_, name) => `${name}=${replacements[name]}`);
try {
  await writeFile(destination, content, { flag: 'wx', mode: 0o600 });
  console.log('.env.docker criado com credenciais aleatórias. Consulte e ajuste o arquivo no seu editor. Nenhum segredo foi exibido.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('.env.docker já existe. Configuração preservada; nenhuma credencial foi substituída.');
  else throw new Error('Não foi possível criar .env.docker. Confira a permissão da pasta.');
}
