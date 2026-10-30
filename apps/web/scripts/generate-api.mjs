import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Only routing metadata is generated here. All DTOs use backend-generated types.
const root = resolve(import.meta.dirname, "../../..");
const schema = JSON.parse(
  await readFile(resolve(root, "packages/contracts/openapi.json"), "utf8"),
);
const metadata = {};
for (const [path, methods] of Object.entries(schema.paths))
  for (const [method, operation] of Object.entries(methods)) {
    if (!operation.operationId) continue;
    metadata[operation.operationId] = {
      method: method.toUpperCase(),
      path: path.startsWith("/v1/") ? path.slice(3) : path,
    };
  }
const content = `// Generated routing metadata from implemented OpenAPI ${schema.info.version}.\n// Run node apps/web/scripts/generate-api.mjs. DTOs belong to the shared contract.\nimport type { operations } from '@travessia/contracts/api';\nexport const apiRoutes = ${JSON.stringify(metadata, null, 2)} as const;\nexport type ApiResponse<K extends keyof operations> = operations[K]['responses'][200]['content']['application/json'];\nexport type ApiBody<K extends keyof operations> = operations[K] extends { requestBody: { content: { 'application/json': infer T } } } ? T : never;\ntype Params<K extends keyof operations> = operations[K]['parameters'] extends { path: infer T } ? T : {};\ntype Query<K extends keyof operations> = operations[K]['parameters'] extends { query?: infer T } ? NonNullable<T> : never;\nexport type ApiOperations = { [K in keyof typeof apiRoutes]: { response: ApiResponse<K>; body: ApiBody<K>; params: Params<K>; query: Query<K> } };\n`;
await writeFile(resolve(root, "apps/web/lib/api.generated.ts"), content);
console.log(
  `Generated routing adapter for ${Object.keys(metadata).length} implemented operations; DTOs use @travessia/contracts/api.`,
);
