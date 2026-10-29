import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const colors = JSON.parse(read('packages/design-tokens/colors.json'));
function luminance(hex) {
  const values = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
const pairs = [['text', 'background'], ['text', 'surface'], ['muted', 'background'], ['muted', 'surface'], ['onPrimary', 'primary'], ['terracotta', 'surface'], ['text', 'sage'], ['text', 'gold']];
for (const [foreground, background] of pairs) {
  const values = [luminance(colors[foreground]), luminance(colors[background])].sort((a,b) => b-a);
  const ratio = (values[0]+.05)/(values[1]+.05);
  assert.ok(ratio >= 4.5, `${foreground}/${background}: ${ratio.toFixed(2)} abaixo de 4.5:1`);
  console.log(`Contraste ${foreground}/${background}: ${ratio.toFixed(2)}:1`);
}
for (const [name, color] of Object.entries(colors)) {
  const cssName = name === 'onPrimary' ? 'on-primary' : name;
  assert.ok(read('packages/design-tokens/tokens.css').includes(`--${cssName}: ${color}`), `Token divergente: ${name}`);
}
const api = JSON.parse(read('packages/contracts/openapi.json'));
assert.equal(api.openapi, '3.1.0');
assert.ok(api.paths['/v1/health']);
assert.deepEqual(api.paths['/v1/health'].get.security, []);
for (const [path, methods] of Object.entries(api.paths)) {
  if (path === '/v1/health') continue;
  for (const operation of Object.values(methods)) assert.deepEqual(operation.security, [{ session: [] }]);
}
for (const file of ['AGENTS.md','apps/web/AGENTS.md','apps/api/AGENTS.md','docs/ACCESSIBILITY.md','docs/SECURITY.md','docs/REFERENCES.md','docs/agents/FRONTEND.md','docs/agents/BACKEND.md']) {
  assert.ok(existsSync(resolve(root, file)), `Falta ${file}`);
}
assert.ok(read('docs/REFERENCES.md').includes('PENDENTE'));
function inspect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.next','.git','dist'].includes(entry.name)) continue;
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) inspect(path);
    else if (/\.(ts|tsx|css|json)$/.test(path) && !path.endsWith('package-lock.json')) {
      assert.ok(!/NEXT_PUBLIC_(?:GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY)/.test(readFileSync(path,'utf8')), 'Segredo em variável pública');
    }
  }
}
inspect(resolve(root,'apps'));
console.log('Fundação e contratos verificados. Isso não substitui auditoria de acessibilidade ou segurança.');
