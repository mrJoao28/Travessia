import { z } from 'zod';

export const supportChoice = z.enum(['large-print', 'wide-spacing', 'high-contrast', 'literal-language', 'short-sections', 'glossary', 'image-description', 'narration']);
export const materialSettings = z.strictObject({ supports: z.array(supportChoice).max(8).refine(v => new Set(v).size === v.length),
  fontSize: z.enum(['18', '22', '26']), color: z.enum(['default', 'high', 'dark']), useAi: z.boolean(), approvedForProvider: z.boolean(), deliveryMode: z.enum(['adapted', 'original']).optional() });
export const storedMaterialSettings = materialSettings.extend({ regeneratePage: z.number().int().min(1).max(20).optional() });
export const documentPage = z.strictObject({ page: z.number().int().min(1).max(20), title: z.string().trim().min(1).max(200),
  text: z.string().max(12000), description: z.string().max(4000),
  steps: z.array(z.string().trim().min(1).max(1500)).max(12).optional(),
  glossary: z.array(z.strictObject({
    term: z.string().trim().min(1).max(120),
    definition: z.string().trim().min(1).max(600),
  })).max(12).optional(),
});
export const materialDocument = z.array(documentPage).min(1).max(4).refine(p => new Set(p.map(v => v.page)).size === p.length);
export function materialContentLength(document: z.infer<typeof materialDocument>) {
  return document.reduce((total, page) => total + page.text.length + page.description.length +
    (page.steps?.reduce((sum, step) => sum + step.length, 0) ?? 0) +
    (page.glossary?.reduce((sum, entry) => sum + entry.term.length + entry.definition.length, 0) ?? 0), 0);
}
const key = z.string().min(1).max(100);
export const sourceView = z.strictObject({ id: key, versionId: key, title: z.string(), status: z.enum(['queued', 'extracting', 'ready', 'failed']),
  pageCount: z.number().int(), pages: z.array(z.strictObject({ page: z.number().int(), text: z.string(), hasVisual: z.boolean(), ocr: z.boolean() })), warnings: z.array(z.string()), expiresAt: z.iso.datetime() });
export const materialView = z.strictObject({ mode: z.enum(['adapted','original']).optional(), id: key, versionId: key, sourceId: key, studentId: key, status: z.enum(['queued', 'generating', 'draft', 'rendering', 'ready', 'released', 'failed']),
  settings: materialSettings, pages: z.array(z.number().int()), document: z.array(documentPage), revision: z.number().int(), error: z.string().nullable(),
  hasAudio: z.boolean(), inputTokens: z.number().nullable(), outputTokens: z.number().nullable(), expiresAt: z.iso.datetime() });
const empty = z.strictObject({});
const versionQuery = z.strictObject({ versionId: key });
export const materialRoutes = {
  materialSources: { method: 'get', path: '/v1/missions/{id}/material-sources', body: empty, query: versionQuery, response: z.strictObject({ items: z.array(sourceView) }) },
  uploadMaterialSource: { method: 'post', path: '/v1/missions/{id}/material-sources', body: z.strictObject({ versionId: key, title: z.string().trim().min(1).max(150), base64: z.string().min(8).max(13981016), requestKey: z.uuid() }), query: empty, response: sourceView },
  deleteMaterialSource: { method: 'delete', path: '/v1/missions/{id}/material-sources/{sourceId}', body: empty, query: empty, response: z.strictObject({ removed: z.literal(true) }) },
  materialAdaptations: { method: 'get', path: '/v1/missions/{id}/material-adaptations', body: empty, query: versionQuery, response: z.strictObject({ items: z.array(materialView) }) },
  releaseOriginalMaterial: { method: 'post', path: '/v1/missions/{id}/original-materials', body: z.strictObject({versionId:key,sourceId:key,studentId:key,requestKey:z.uuid(),reviewed:z.literal(true)}), query:empty,response:materialView },
  prepareMaterial: { method: 'post', path: '/v1/missions/{id}/material-adaptations', body: z.strictObject({ versionId: key, sourceId: key, studentId: key,
    pages: z.array(z.number().int().min(1).max(20)).min(1).max(4).refine(v => new Set(v).size === v.length), settings: materialSettings.refine(v=>v.supports.length>0&&v.deliveryMode!=='original','Escolha pelo menos um apoio para a versão adaptada.'), requestKey: z.uuid() }), query: empty, response: materialView },
  editMaterial: { method: 'patch', path: '/v1/missions/{id}/material-adaptations/{adaptationId}', body: z.strictObject({ expectedRevision: z.number().int().min(1), document: materialDocument, regeneratePage: z.number().int().min(1).max(20).optional(), approvedForProvider: z.literal(true).optional() }), query: empty, response: materialView },
  renderMaterial: { method: 'post', path: '/v1/missions/{id}/material-adaptations/{adaptationId}/render', body: z.strictObject({ expectedRevision: z.number().int().min(1) }), query: empty, response: materialView },
  releaseMaterial: { method: 'post', path: '/v1/missions/{id}/material-adaptations/{adaptationId}/release', body: z.strictObject({ expectedRevision: z.number().int().min(1), reviewed: z.literal(true) }), query: empty, response: materialView },
  removeMaterial: { method: 'delete', path: '/v1/missions/{id}/material-adaptations/{adaptationId}', body: empty, query: empty, response: z.strictObject({ removed: z.literal(true) }) },
  learnerMaterials: { method: 'get', path: '/v1/missions/{id}/my-materials', body: empty, query: versionQuery, response: z.strictObject({ items: z.array(z.strictObject({ id: key, title: z.string(), mode:z.enum(['adapted','original']).optional(), document: z.array(documentPage).max(4), hasAudio: z.boolean() })) }) },
  materialAsset: { method: 'get', path: '/v1/missions/{id}/material-assets/{assetId}/{kind}', body: empty, query: empty, response: z.string(), binary: true },
} as const;
