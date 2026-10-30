import { z } from 'zod';
import { strategyCatalog } from './strategy-catalog.js';

export const id = z.string().min(1).max(100);
const text = z.string().trim().min(1).max(6000);
const short = z.string().trim().min(1).max(200);
const date = z.iso.datetime();
const list = <T extends z.ZodType>(item: T) => z.strictObject({ items: z.array(item), nextCursor: z.string().nullable() });
export const page = z.strictObject({ limit: z.coerce.number().int().min(1).max(50).default(20), cursor: id.optional() });
const empty = z.strictObject({});
const error = z.strictObject({ code: z.string(), message: z.string(), requestId: z.string() });
export const preferences = z.strictObject({ fontSize: z.enum(['default', 'large', 'larger']).optional(),
  spacing: z.enum(['default', 'wide']).optional(), contrast: z.enum(['default', 'high']).optional(), reducedDistractions: z.boolean().optional() });
export const missionInput = z.strictObject({ title: short, description: text, objectives: z.array(short).min(1).max(10),
  criteria: z.array(short).min(1).max(10), dueAt: date.nullable().optional(),
  steps: z.array(z.strictObject({ title: short, instructions: text, example: text })).min(1).max(10),
  materials: z.array(z.strictObject({ title: short, text })).max(10) });
export type MissionInput = z.infer<typeof missionInput>;
const version = missionInput.extend({ id, missionId: id, source: z.enum(['manual', 'gemini', 'demo_fixture']),
  createdAt: date, dueAt: date.nullable(),
  steps: z.array(z.strictObject({ id, position: z.number().int(), title: short, instructions: text, example: text })),
  materials: z.array(z.strictObject({ id, title: short, text, hasFile: z.boolean() })) });
const mission = z.strictObject({ id, classroomId: id, status: z.enum(['draft', 'published', 'archived']),
  draftVersion: version.nullable(), publishedVersion: version.nullable() });
const classroom = z.strictObject({ id, name: short, role: z.enum(['student', 'teacher']) });
const feedback = z.strictObject({ id, content: text, createdAt: date });
const submission = z.strictObject({ id, versionId: id, userId: id, status: z.enum(['draft', 'submitted', 'reviewed']),
  content: z.string().max(12000), completedStepIds: z.array(id), currentStepId: id, revision: z.number().int(),
  submittedAt: date.nullable(), updatedAt: date, feedback: z.array(feedback) });
const barrier = z.strictObject({ id, stepId: id, description: text, sharedWithTeacher: z.boolean(), response: text.nullable(), createdAt: date });
const generation = z.strictObject({ id, missionId: id, status: z.enum(['running', 'succeeded', 'failed', 'cancelled']),
  outputVersionId: id.nullable(), createdAt: date });

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
const studentInput = z.strictObject({ registration: optionalText(50), institution: optionalText(80),
  unit: optionalText(150), course: optionalText(150), period: optionalText(50) });
const teaching = z.strictObject({ subject: z.string().trim().min(1).max(150), course: z.string().trim().min(1).max(150) });
const teacherInput = z.strictObject({ teachings: z.array(teaching).max(20).superRefine((rows, ctx) => {
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const key = JSON.stringify([row.subject.toLocaleLowerCase('pt-BR'), row.course.toLocaleLowerCase('pt-BR')]);
    if (seen.has(key)) ctx.addIssue({ code: 'custom', path: [index], message: 'Disciplina e curso repetidos.' });
    seen.add(key);
  });
}) });
const academicProfile = z.strictObject({ id, name: z.string(), email: z.email(), emailVerified: z.boolean(),
  phone: z.string().nullable(), alternateEmail: z.string().nullable(),
  student: z.strictObject({ registration: z.string().nullable(), institution: z.string().nullable(),
    unit: z.string().nullable(), course: z.string().nullable(), period: z.string().nullable() }).nullable(),
  teacher: z.strictObject({ teachings: z.array(teaching) }).nullable() });
export const profileInput = z.strictObject({ name: z.string().trim().min(1).max(150).optional(), phone: optionalText(30),
  alternateEmail: z.email().max(150).nullable().optional(), student: studentInput.optional(), teacher: teacherInput.optional() });

const strategyId = z.enum(strategyCatalog.map(s => s.id));
const strategyItem = z.strictObject({ strategyId, content: z.string().trim().min(1).max(3000) });
export const strategyPlanInput = z.strictObject({ versionId: id, stepId: id.nullable(), audience: z.enum(['classroom', 'students']),
  studentIds: z.array(id).max(50), items: z.array(strategyItem).min(1).max(8), reviewed: z.literal(true) }).superRefine((input, ctx) => {
  if ((input.audience === 'classroom' && input.studentIds.length !== 0) || (input.audience === 'students' && input.studentIds.length === 0))
    ctx.addIssue({ code: 'custom', path: ['studentIds'], message: 'Confira os destinatários.' });
  if (new Set(input.studentIds).size !== input.studentIds.length || new Set(input.items.map(item => item.strategyId)).size !== input.items.length)
    ctx.addIssue({ code: 'custom', message: 'Itens ou destinatários repetidos.' });
});
const strategyPlan = z.strictObject({ id, versionId: id, stepId: id.nullable(), audience: z.enum(['classroom', 'students']), revision: z.number().int(),
  items: z.array(z.strictObject({ id, strategyId, title: short, content: z.string() })),
  recipients: z.array(z.strictObject({ id, name: z.string() })) });

export const routes = {
  health: { method: 'get', path: '/v1/health', body: empty, query: empty, response: z.strictObject({ status: z.literal('ok'), service: z.literal('travessia-api'), stage: z.literal('mvp') }), public: true },
  me: { method: 'get', path: '/v1/me', body: empty, query: empty, response: z.strictObject({ id, name: z.string(), email: z.email(), course: z.string().nullable(), demo: z.boolean(), preferences: preferences }) },
  profile: { method: 'get', path: '/v1/me/profile', body: empty, query: empty, response: academicProfile },
  updateProfile: { method: 'patch', path: '/v1/me/profile', body: profileInput, query: empty, response: academicProfile },
  strategyCatalog: { method: 'get', path: '/v1/strategies', body: empty, query: empty, response: z.strictObject({ items: z.array(z.strictObject({
    id: strategyId, title: short, category: short, description: z.string(), guidance: z.string(), example: z.string(),
  })) }) },
  strategyRecipients: { method: 'get', path: '/v1/missions/{id}/strategy-recipients', body: empty, query: page, response: list(z.strictObject({ id, name: z.string() })) },
  strategyPlans: { method: 'get', path: '/v1/missions/{id}/strategy-plans', body: empty, query: z.strictObject({ versionId: id }), response: z.strictObject({ items: z.array(strategyPlan) }) },
  createStrategyPlan: { method: 'post', path: '/v1/missions/{id}/strategy-plans', body: strategyPlanInput.safeExtend({ requestKey: z.uuid() }), query: empty, response: strategyPlan },
  updateStrategyPlan: { method: 'patch', path: '/v1/missions/{id}/strategy-plans/{planId}', body: strategyPlanInput.safeExtend({ expectedRevision: z.number().int().min(1) }), query: empty, response: strategyPlan },
  removeStrategyPlan: { method: 'post', path: '/v1/missions/{id}/strategy-plans/{planId}/remove', body: z.strictObject({ expectedRevision: z.number().int().min(1) }), query: empty, response: z.strictObject({ removed: z.literal(true) }) },
  missionSupports: { method: 'get', path: '/v1/missions/{id}/supports', body: empty, query: z.strictObject({ versionId: id }), response: z.strictObject({ versionId: id,
    items: z.array(z.strictObject({ id, stepId: id.nullable(), title: short, content: z.string() })) }) },
  preferences: { method: 'patch', path: '/v1/me/preferences', body: preferences, query: empty, response: preferences },
  classrooms: { method: 'get', path: '/v1/classrooms', body: empty, query: page, response: list(classroom) },
  createClassroom: { method: 'post', path: '/v1/classrooms', body: z.strictObject({ name: short }), query: empty, response: classroom },
  members: { method: 'get', path: '/v1/classrooms/{id}/members', body: empty, query: page,
    response: list(z.strictObject({ id, name: z.string(), role: z.enum(['student', 'teacher']), active: z.boolean() })) },
  revokeMember: { method: 'delete', path: '/v1/classrooms/{id}/members/{memberId}', body: empty, query: empty, response: z.strictObject({ revoked: z.literal(true) }) },
  invite: { method: 'post', path: '/v1/classrooms/{id}/invitations', body: empty, query: empty,
    response: z.strictObject({ id, token: z.string(), expiresAt: date }) },
  revokeInvite: { method: 'delete', path: '/v1/classrooms/{id}/invitations/{invitationId}', body: empty, query: empty, response: z.strictObject({ revoked: z.literal(true) }) },
  acceptInvite: { method: 'post', path: '/v1/invitations/accept', body: z.strictObject({ token: z.string().regex(/^[a-f0-9]{64}$/) }), query: empty, response: classroom },
  missions: { method: 'get', path: '/v1/classrooms/{id}/missions', body: empty, query: page, response: list(mission) },
  createMission: { method: 'post', path: '/v1/classrooms/{id}/missions', body: missionInput, query: empty, response: mission },
  mission: { method: 'get', path: '/v1/missions/{id}', body: empty, query: empty, response: mission },
  editMission: { method: 'patch', path: '/v1/missions/{id}', body: missionInput.extend({ expectedDraftVersionId: id.nullable() }), query: empty, response: mission },
  publish: { method: 'post', path: '/v1/missions/{id}/publish', body: z.strictObject({ versionId: id, reviewed: z.literal(true) }), query: empty, response: mission },
  archive: { method: 'post', path: '/v1/missions/{id}/archive', body: empty, query: empty, response: mission },
  saveSubmission: { method: 'post', path: '/v1/missions/{id}/submissions',
    body: z.strictObject({ versionId: id, content: z.string().max(12000), completedStepIds: z.array(id).max(10), currentStepId: id,
      status: z.enum(['draft', 'submitted']), expectedRevision: z.number().int().min(0) }), query: empty, response: submission },
  submissions: { method: 'get', path: '/v1/missions/{id}/submissions', body: empty, query: page, response: list(submission) },
  submission: { method: 'get', path: '/v1/submissions/{id}', body: empty, query: empty, response: submission },
  feedback: { method: 'post', path: '/v1/submissions/{id}/feedback', body: z.strictObject({ content: text }), query: empty, response: submission },
  createBarrier: { method: 'post', path: '/v1/steps/{id}/barriers', body: z.strictObject({ description: text, sharedWithTeacher: z.boolean() }), query: empty, response: barrier },
  barriers: { method: 'get', path: '/v1/classrooms/{id}/barriers', body: empty, query: page, response: list(barrier) },
  barrier: { method: 'get', path: '/v1/barriers/{id}', body: empty, query: empty, response: barrier },
  respondBarrier: { method: 'post', path: '/v1/barriers/{id}/response', body: z.strictObject({ response: text }), query: empty, response: barrier },
  download: { method: 'get', path: '/v1/materials/{id}/download', body: empty, query: empty, response: z.strictObject({ url: z.url(), expiresIn: z.literal(60) }) },
  upload: { method: 'post', path: '/v1/classrooms/{id}/uploads', body: empty, query: empty, response: empty },
  generate: { method: 'post', path: '/v1/missions/{id}/ai-drafts', body: z.strictObject({ materialIds: z.array(id).min(1).max(3), objectives: z.array(short).min(1).max(5),
    approvedForProvider: z.literal(true), idempotencyKey: z.string().uuid() }), query: empty, response: generation },
  generation: { method: 'get', path: '/v1/ai-generations/{id}', body: empty, query: empty, response: generation },
} as const;
export type Operation = keyof typeof routes;
export type Body<K extends Operation> = z.infer<(typeof routes)[K]['body']>;
export type Paging = z.infer<typeof page>;

export function openapi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [operationId, route] of Object.entries(routes)) {
    const parameters: {name: string; in: string; required: boolean; schema: unknown}[] = Array.from(route.path.matchAll(/\{(\w+)\}/g), ([, name]) => ({ name, in: 'path', required: true, schema: z.toJSONSchema(id) }));
    const query = z.toJSONSchema(route.query, { io: 'input' }) as { properties?: Record<string, unknown>; required?: string[] };
    for (const [name, schema] of Object.entries(query.properties ?? {})) parameters.push({ name, in: 'query', required: query.required?.includes(name) ?? false, schema });
    (paths[route.path] ??= {})[route.method] = { operationId, security: 'public' in route && route.public === true ? [] : [{ session: [] }], parameters,
      ...(route.method === 'get' || route.method === 'delete' ? {} : { requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(route.body) } } } }),
      responses: { '200': { description: 'Sucesso', content: { 'application/json': { schema: z.toJSONSchema(route.response) } } },
        default: { description: 'Erro', content: { 'application/json': { schema: z.toJSONSchema(error) } } } } };
  }
  return { openapi: '3.1.0', info: { title: 'Travessia API', version: '1.0.0', description: 'Produto implementado; auth Better Auth em /api/auth, documentado em BACKEND-INTEGRATION.md.' },
    servers: [{ url: 'http://localhost:3001' }], paths,
    components: { securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token', description: 'Em HTTPS: __Secure-better-auth.session_token' } } } };
}
