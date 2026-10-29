import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Product types are generated, never independently maintained in the UI.
// Normal input is the implemented OpenAPI. --source permits reviewing a backend
// worktree's authored contract while its generated artifacts are being prepared.
const root = resolve(import.meta.dirname, "../../..");
const sourceIndex = process.argv.indexOf("--source");
const schema =
  sourceIndex === -1
    ? JSON.parse(
        await readFile(
          resolve(root, "packages/contracts/openapi.json"),
          "utf8",
        ),
      )
    : (
        await import(pathToFileURL(resolve(process.argv[sourceIndex + 1])).href)
      ).openapi();
function type(s) {
  if (!s) return "unknown";
  if (s.$ref) {
    let value = schema;
    for (const key of s.$ref.slice(2).split("/")) value = value[key];
    return type(value);
  }
  if ("const" in s) return JSON.stringify(s.const);
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.anyOf || s.oneOf) return (s.anyOf ?? s.oneOf).map(type).join(" | ");
  if (s.allOf) return s.allOf.map(type).join(" & ");
  if (Array.isArray(s.type))
    return s.type.map((t) => type({ ...s, type: t })).join(" | ");
  if (s.type === "object" || s.properties)
    return `{ ${Object.entries(s.properties ?? {})
      .map(
        ([k, v]) =>
          `${JSON.stringify(k)}${s.required?.includes(k) ? "" : "?"}: ${type(v)}`,
      )
      .join("; ")} }`;
  if (s.type === "array") return `Array<${type(s.items)}>`;
  if (s.type === "integer" || s.type === "number") return "number";
  if (s.type === "string") return "string";
  if (s.type === "boolean") return "boolean";
  if (s.type === "null") return "null";
  return "unknown";
}
const operations = [];
const metadata = {};
for (const [path, methods] of Object.entries(schema.paths))
  for (const [method, operation] of Object.entries(methods)) {
    if (!operation.operationId) continue;
    const response =
      operation.responses["200"].content?.["application/json"]?.schema;
    const body = operation.requestBody?.content?.["application/json"]?.schema;
    const params = (operation.parameters ?? []).filter((p) => p.in === "path");
    operations.push(
      `${operation.operationId}: { response: ${type(response)}; body: ${body ? type(body) : "never"}; params: { ${params.map((p) => `${JSON.stringify(p.name)}: string`).join("; ")} } }`,
    );
    metadata[operation.operationId] = {
      method: method.toUpperCase(),
      path: path.startsWith("/v1/") ? path.slice(3) : path,
    };
  }
const content = `// Generated from backend OpenAPI ${schema.info.version}. Run apps/web/scripts/generate-api.mjs.\n// Do not edit DTOs by hand.\nexport interface ApiOperations {\n${operations.join("\n")}\n}\nexport const apiRoutes = ${JSON.stringify(metadata, null, 2)} as const;\nexport type ApiResponse<K extends keyof ApiOperations> = ApiOperations[K]['response'];\nexport type ApiBody<K extends keyof ApiOperations> = ApiOperations[K]['body'];\n`;
await writeFile(resolve(root, "apps/web/lib/api.generated.ts"), content);
console.log(
  `Generated ${operations.length} operations from backend-authored contract ${schema.info.version}.`,
);
