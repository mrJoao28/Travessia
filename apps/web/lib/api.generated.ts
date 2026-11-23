// Generated routing metadata from implemented OpenAPI 1.0.0.
// Run node apps/web/scripts/generate-api.mjs. DTOs belong to the shared contract.
import type { operations } from '@travessia/contracts/api';
export const apiRoutes = {
  "materialSources": {
    "method": "GET",
    "path": "/activities/{id}/material-sources"
  },
  "uploadMaterialSource": {
    "method": "POST",
    "path": "/activities/{id}/material-sources"
  },
  "deleteMaterialSource": {
    "method": "DELETE",
    "path": "/activities/{id}/material-sources/{sourceId}"
  },
  "materialAdaptations": {
    "method": "GET",
    "path": "/activities/{id}/material-adaptations"
  },
  "prepareMaterial": {
    "method": "POST",
    "path": "/activities/{id}/material-adaptations"
  },
  "releaseOriginalMaterial": {
    "method": "POST",
    "path": "/activities/{id}/original-materials"
  },
  "editMaterial": {
    "method": "PATCH",
    "path": "/activities/{id}/material-adaptations/{adaptationId}"
  },
  "removeMaterial": {
    "method": "DELETE",
    "path": "/activities/{id}/material-adaptations/{adaptationId}"
  },
  "renderMaterial": {
    "method": "POST",
    "path": "/activities/{id}/material-adaptations/{adaptationId}/render"
  },
  "releaseMaterial": {
    "method": "POST",
    "path": "/activities/{id}/material-adaptations/{adaptationId}/release"
  },
  "learnerMaterials": {
    "method": "GET",
    "path": "/activities/{id}/my-materials"
  },
  "materialAsset": {
    "method": "GET",
    "path": "/activities/{id}/material-assets/{assetId}/{kind}"
  },
  "health": {
    "method": "GET",
    "path": "/health"
  },
  "me": {
    "method": "GET",
    "path": "/me"
  },
  "profile": {
    "method": "GET",
    "path": "/me/profile"
  },
  "updateProfile": {
    "method": "PATCH",
    "path": "/me/profile"
  },
  "learningOptions": {
    "method": "GET",
    "path": "/learning-options"
  },
  "learningNeeds": {
    "method": "GET",
    "path": "/me/learning-needs"
  },
  "updateLearningNeeds": {
    "method": "PATCH",
    "path": "/me/learning-needs"
  },
  "needsSharing": {
    "method": "GET",
    "path": "/classrooms/{id}/needs-sharing"
  },
  "updateNeedsSharing": {
    "method": "PATCH",
    "path": "/classrooms/{id}/needs-sharing"
  },
  "sharedLearningNeeds": {
    "method": "GET",
    "path": "/classrooms/{id}/learning-needs"
  },
  "adaptationPlans": {
    "method": "GET",
    "path": "/activities/{id}/adaptations"
  },
  "createAdaptation": {
    "method": "POST",
    "path": "/activities/{id}/adaptations"
  },
  "updateAdaptation": {
    "method": "PATCH",
    "path": "/activities/{id}/adaptations/{planId}"
  },
  "removeAdaptation": {
    "method": "POST",
    "path": "/activities/{id}/adaptations/{planId}/remove"
  },
  "learnerAdaptations": {
    "method": "GET",
    "path": "/activities/{id}/my-adaptations"
  },
  "submissionAudio": {
    "method": "GET",
    "path": "/submissions/{id}/audio"
  },
  "submissionTextFile": {
    "method": "GET",
    "path": "/submissions/{id}/text-file"
  },
  "strategyCatalog": {
    "method": "GET",
    "path": "/strategies"
  },
  "strategyRecipients": {
    "method": "GET",
    "path": "/activities/{id}/strategy-recipients"
  },
  "strategyPlans": {
    "method": "GET",
    "path": "/activities/{id}/strategy-plans"
  },
  "createStrategyPlan": {
    "method": "POST",
    "path": "/activities/{id}/strategy-plans"
  },
  "updateStrategyPlan": {
    "method": "PATCH",
    "path": "/activities/{id}/strategy-plans/{planId}"
  },
  "removeStrategyPlan": {
    "method": "POST",
    "path": "/activities/{id}/strategy-plans/{planId}/remove"
  },
  "missionSupports": {
    "method": "GET",
    "path": "/activities/{id}/supports"
  },
  "supportAudio": {
    "method": "GET",
    "path": "/activities/{id}/support-audio/{itemId}"
  },
  "generateSupports": {
    "method": "POST",
    "path": "/activities/{id}/ai-supports"
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
  "archiveClassroom": {
    "method": "DELETE",
    "path": "/classrooms/{id}"
  },
  "gradePeriods": {
    "method": "GET",
    "path": "/classrooms/{id}/grade-periods"
  },
  "createGradePeriod": {
    "method": "POST",
    "path": "/classrooms/{id}/grade-periods"
  },
  "addGradeAssessment": {
    "method": "POST",
    "path": "/grade-periods/{id}/assessments"
  },
  "gradebook": {
    "method": "GET",
    "path": "/grade-periods/{id}/gradebook"
  },
  "classroomTeams": {
    "method": "GET",
    "path": "/classrooms/{id}/teams"
  },
  "createClassroomTeam": {
    "method": "POST",
    "path": "/classrooms/{id}/teams"
  },
  "updateClassroomTeam": {
    "method": "PATCH",
    "path": "/classrooms/{id}/teams/{teamId}"
  },
  "deleteClassroomTeam": {
    "method": "DELETE",
    "path": "/classrooms/{id}/teams/{teamId}"
  },
  "members": {
    "method": "GET",
    "path": "/classrooms/{id}/members"
  },
  "leaveClassroom": {
    "method": "POST",
    "path": "/classrooms/{id}/leave"
  },
  "revokeMember": {
    "method": "DELETE",
    "path": "/classrooms/{id}/members/{memberId}"
  },
  "invitations": {
    "method": "GET",
    "path": "/classrooms/{id}/invitations"
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
    "path": "/classrooms/{id}/activities"
  },
  "createMission": {
    "method": "POST",
    "path": "/classrooms/{id}/activities"
  },
  "mission": {
    "method": "GET",
    "path": "/activities/{id}"
  },
  "editMission": {
    "method": "PATCH",
    "path": "/activities/{id}"
  },
  "deleteMission": {
    "method": "DELETE",
    "path": "/activities/{id}"
  },
  "copyMission": {
    "method": "POST",
    "path": "/activities/{id}/copy"
  },
  "publish": {
    "method": "POST",
    "path": "/activities/{id}/publish"
  },
  "archive": {
    "method": "POST",
    "path": "/activities/{id}/archive"
  },
  "groups": {
    "method": "GET",
    "path": "/activities/{id}/groups"
  },
  "createGroup": {
    "method": "POST",
    "path": "/activities/{id}/groups"
  },
  "updateGroup": {
    "method": "PATCH",
    "path": "/activities/{id}/groups/{groupId}"
  },
  "removeGroup": {
    "method": "DELETE",
    "path": "/activities/{id}/groups/{groupId}"
  },
  "setParticipationMode": {
    "method": "PATCH",
    "path": "/activities/{id}/participants/{studentId}"
  },
  "saveSubmission": {
    "method": "POST",
    "path": "/activities/{id}/submissions"
  },
  "submissions": {
    "method": "GET",
    "path": "/activities/{id}/submissions"
  },
  "validateSubmissionStep": {
    "method": "POST",
    "path": "/submissions/{id}/steps/{stepId}/validate"
  },
  "submission": {
    "method": "GET",
    "path": "/submissions/{id}"
  },
  "feedback": {
    "method": "POST",
    "path": "/submissions/{id}/feedback"
  },
  "generateFeedbackDraft": {
    "method": "POST",
    "path": "/submissions/{id}/ai-feedback-draft"
  },
  "setStepDeadlineExtension": {
    "method": "PATCH",
    "path": "/activities/{id}/steps/{stepId}/deadline-extension"
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
    "path": "/activities/{id}/ai-drafts"
  },
  "generation": {
    "method": "GET",
    "path": "/ai-generations/{id}"
  }
} as const;
export type ApiResponse<K extends keyof operations> = operations[K]['responses'][200]['content']['application/json' & keyof operations[K]['responses'][200]['content']];
export type ApiBody<K extends keyof operations> = operations[K] extends { requestBody: { content: { 'application/json': infer T } } } ? T : never;
type Params<K extends keyof operations> = operations[K]['parameters'] extends { path: infer T } ? T : {};
type Query<K extends keyof operations> = operations[K]['parameters'] extends { query?: infer T } ? NonNullable<T> : never;
export type ApiOperations = { [K in keyof typeof apiRoutes]: { response: ApiResponse<K>; body: ApiBody<K>; params: Params<K>; query: Query<K> } };
