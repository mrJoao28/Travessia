// Generated routing metadata from implemented OpenAPI 1.0.0.
// Run node apps/web/scripts/generate-api.mjs. DTOs belong to the shared contract.
import type { operations } from '@travessia/contracts/api';
export const apiRoutes = {
  "health": {
    "method": "GET",
    "path": "/health"
  },
  "me": {
    "method": "GET",
    "path": "/me"
  },
  "preferences": {
    "method": "PATCH",
    "path": "/me/preferences"
  },
  "classrooms": {
    "method": "GET",
    "path": "/classrooms"
  },
  "createClassroom": {
    "method": "POST",
    "path": "/classrooms"
  },
  "members": {
    "method": "GET",
    "path": "/classrooms/{id}/members"
  },
  "revokeMember": {
    "method": "DELETE",
    "path": "/classrooms/{id}/members/{memberId}"
  },
  "invite": {
    "method": "POST",
    "path": "/classrooms/{id}/invitations"
  },
  "revokeInvite": {
    "method": "DELETE",
    "path": "/classrooms/{id}/invitations/{invitationId}"
  },
  "acceptInvite": {
    "method": "POST",
    "path": "/invitations/accept"
  },
  "missions": {
    "method": "GET",
    "path": "/classrooms/{id}/missions"
  },
  "createMission": {
    "method": "POST",
    "path": "/classrooms/{id}/missions"
  },
  "mission": {
    "method": "GET",
    "path": "/missions/{id}"
  },
  "editMission": {
    "method": "PATCH",
    "path": "/missions/{id}"
  },
  "publish": {
    "method": "POST",
    "path": "/missions/{id}/publish"
  },
  "archive": {
    "method": "POST",
    "path": "/missions/{id}/archive"
  },
  "saveSubmission": {
    "method": "POST",
    "path": "/missions/{id}/submissions"
  },
  "submissions": {
    "method": "GET",
    "path": "/missions/{id}/submissions"
  },
  "submission": {
    "method": "GET",
    "path": "/submissions/{id}"
  },
  "feedback": {
    "method": "POST",
    "path": "/submissions/{id}/feedback"
  },
  "createBarrier": {
    "method": "POST",
    "path": "/steps/{id}/barriers"
  },
  "barriers": {
    "method": "GET",
    "path": "/classrooms/{id}/barriers"
  },
  "barrier": {
    "method": "GET",
    "path": "/barriers/{id}"
  },
  "respondBarrier": {
    "method": "POST",
    "path": "/barriers/{id}/response"
  },
  "download": {
    "method": "GET",
    "path": "/materials/{id}/download"
  },
  "upload": {
    "method": "POST",
    "path": "/classrooms/{id}/uploads"
  },
  "generate": {
    "method": "POST",
    "path": "/missions/{id}/ai-drafts"
  },
  "generation": {
    "method": "GET",
    "path": "/ai-generations/{id}"
  }
} as const;
export type ApiResponse<K extends keyof operations> = operations[K]['responses'][200]['content']['application/json'];
export type ApiBody<K extends keyof operations> = operations[K] extends { requestBody: { content: { 'application/json': infer T } } } ? T : never;
type Params<K extends keyof operations> = operations[K]['parameters'] extends { path: infer T } ? T : {};
export type ApiOperations = { [K in keyof typeof apiRoutes]: { response: ApiResponse<K>; body: ApiBody<K>; params: Params<K> } };
