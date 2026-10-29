import { db } from './database.js';
import { readConfig } from './config.js';
import { seedDemo } from './seed.js';

try {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--rotate-password')) throw new Error('Argumento inválido.');
  await seedDemo(db, readConfig(), { rotatePassword: args.includes('--rotate-password') });
  console.log('Dataset de demonstração preparado. Credenciais preservadas em ambiente privado.');
} catch {
  console.error('Seed não executado. Verifique isolamento, banco, migrations e variáveis privadas.');
  process.exitCode = 1;
} finally { await db.$disconnect(); }
