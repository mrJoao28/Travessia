import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
let settings;
try { settings = parseEnv(readFileSync(resolve(root, '.env.docker'), 'utf8')); }
catch { throw new Error('Crie .env.docker primeiro com npm run docker:setup.'); }
export { settings };

export function runCompose(args) {
  // The selected file wins over unrelated host variables (especially DATABASE_URL).
  const result = spawnSync('docker', ['compose', '--project-directory', root, '--env-file', resolve(root, '.env.docker'), ...args], {
    cwd: root, stdio: 'inherit', env: { ...process.env, ...settings },
  });
  if (result.error) throw new Error('Não foi possível executar Docker Compose. Confira se o Docker Desktop está iniciado.');
  return result.status ?? 1;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = runCompose(process.argv.slice(2));
}
