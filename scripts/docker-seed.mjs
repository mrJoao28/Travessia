import { runCompose, settings } from './docker-compose.mjs';

if (!settings.DEMO_USER_EMAIL || !settings.DEMO_USER_PASSWORD) {
  throw new Error('Configure as credenciais de demonstração no arquivo .env.docker.');
}
process.exitCode = runCompose(['run', '--rm', '--no-deps', '-e', 'DEMO_USER_EMAIL', '-e', 'DEMO_USER_PASSWORD',
  'api', 'node', 'apps/api/dist/seed-cli.js']);
