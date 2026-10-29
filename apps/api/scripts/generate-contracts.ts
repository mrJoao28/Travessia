import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openapi } from '../src/contracts.js';
writeFileSync(fileURLToPath(new URL('../../../packages/contracts/openapi.json', import.meta.url)), JSON.stringify(openapi(), null, 2) + '\n');
