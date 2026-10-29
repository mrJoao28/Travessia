// Generated from backend OpenAPI 1.0.0. Run apps/web/scripts/generate-api.mjs.
// Do not edit DTOs by hand.
export interface ApiOperations {
  health: {
    response: { status: "ok"; service: "travessia-api"; stage: "mvp" };
    body: never;
    params: {};
  };
  me: {
    response: {
      id: string;
      name: string;
      email: string;
      course: string | null;
      demo: boolean;
      preferences: {
        fontSize?: "default" | "large" | "larger";
        spacing?: "default" | "wide";
        contrast?: "default" | "high";
        reducedDistractions?: boolean;
      };
    };
    body: never;
    params: {};
  };
  preferences: {
    response: {
      fontSize?: "default" | "large" | "larger";
      spacing?: "default" | "wide";
      contrast?: "default" | "high";
      reducedDistractions?: boolean;
    };
    body: {
      fontSize?: "default" | "large" | "larger";
      spacing?: "default" | "wide";
      contrast?: "default" | "high";
      reducedDistractions?: boolean;
    };
    params: {};
  };
  classrooms: {
    response: {
      items: Array<{ id: string; name: string; role: "student" | "teacher" }>;
      nextCursor: string | null;
    };
    body: never;
    params: {};
  };
  createClassroom: {
    response: { id: string; name: string; role: "student" | "teacher" };
    body: { name: string };
    params: {};
  };
  members: {
    response: {
      items: Array<{
        id: string;
        name: string;
        role: "student" | "teacher";
        active: boolean;
      }>;
      nextCursor: string | null;
    };
    body: never;
    params: { id: string };
  };
  revokeMember: {
    response: { revoked: true };
    body: never;
    params: { id: string; memberId: string };
  };
  invite: {
    response: { id: string; token: string; expiresAt: string };
    body: {};
    params: { id: string };
  };
  revokeInvite: {
    response: { revoked: true };
    body: never;
    params: { id: string; invitationId: string };
  };
  acceptInvite: {
    response: { id: string; name: string; role: "student" | "teacher" };
    body: { token: string };
    params: {};
  };
  missions: {
    response: {
      items: Array<{
        id: string;
        classroomId: string;
        status: "draft" | "published" | "archived";
        draftVersion: {
          title: string;
          description: string;
          objectives: Array<string>;
          criteria: Array<string>;
          dueAt: string | null;
          steps: Array<{
            id: string;
            position: number;
            title: string;
            instructions: string;
            example: string;
          }>;
          materials: Array<{
            id: string;
            title: string;
            text: string;
            hasFile: boolean;
          }>;
          id: string;
          missionId: string;
          source: "manual" | "gemini" | "demo_fixture";
          createdAt: string;
        } | null;
        publishedVersion: {
          title: string;
          description: string;
          objectives: Array<string>;
          criteria: Array<string>;
          dueAt: string | null;
          steps: Array<{
            id: string;
            position: number;
            title: string;
            instructions: string;
            example: string;
          }>;
          materials: Array<{
            id: string;
            title: string;
            text: string;
            hasFile: boolean;
          }>;
          id: string;
          missionId: string;
          source: "manual" | "gemini" | "demo_fixture";
          createdAt: string;
        } | null;
      }>;
      nextCursor: string | null;
    };
    body: never;
    params: { id: string };
  };
  createMission: {
    response: {
      id: string;
      classroomId: string;
      status: "draft" | "published" | "archived";
      draftVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
      publishedVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
    };
    body: {
      title: string;
      description: string;
      objectives: Array<string>;
      criteria: Array<string>;
      dueAt?: string | null;
      steps: Array<{ title: string; instructions: string; example: string }>;
      materials: Array<{ title: string; text: string }>;
    };
    params: { id: string };
  };
  mission: {
    response: {
      id: string;
      classroomId: string;
      status: "draft" | "published" | "archived";
      draftVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
      publishedVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
    };
    body: never;
    params: { id: string };
  };
  editMission: {
    response: {
      id: string;
      classroomId: string;
      status: "draft" | "published" | "archived";
      draftVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
      publishedVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
    };
    body: {
      title: string;
      description: string;
      objectives: Array<string>;
      criteria: Array<string>;
      dueAt?: string | null;
      steps: Array<{ title: string; instructions: string; example: string }>;
      materials: Array<{ title: string; text: string }>;
      expectedDraftVersionId: string | null;
    };
    params: { id: string };
  };
  publish: {
    response: {
      id: string;
      classroomId: string;
      status: "draft" | "published" | "archived";
      draftVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
      publishedVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
    };
    body: { versionId: string; reviewed: true };
    params: { id: string };
  };
  archive: {
    response: {
      id: string;
      classroomId: string;
      status: "draft" | "published" | "archived";
      draftVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
      publishedVersion: {
        title: string;
        description: string;
        objectives: Array<string>;
        criteria: Array<string>;
        dueAt: string | null;
        steps: Array<{
          id: string;
          position: number;
          title: string;
          instructions: string;
          example: string;
        }>;
        materials: Array<{
          id: string;
          title: string;
          text: string;
          hasFile: boolean;
        }>;
        id: string;
        missionId: string;
        source: "manual" | "gemini" | "demo_fixture";
        createdAt: string;
      } | null;
    };
    body: {};
    params: { id: string };
  };
  saveSubmission: {
    response: {
      id: string;
      versionId: string;
      userId: string;
      status: "draft" | "submitted" | "reviewed";
      content: string;
      completedStepIds: Array<string>;
      currentStepId: string;
      revision: number;
      submittedAt: string | null;
      updatedAt: string;
      feedback: Array<{ id: string; content: string; createdAt: string }>;
    };
    body: {
      versionId: string;
      content: string;
      completedStepIds: Array<string>;
      currentStepId: string;
      status: "draft" | "submitted";
      expectedRevision: number;
    };
    params: { id: string };
  };
  submissions: {
    response: {
      items: Array<{
        id: string;
        versionId: string;
        userId: string;
        status: "draft" | "submitted" | "reviewed";
        content: string;
        completedStepIds: Array<string>;
        currentStepId: string;
        revision: number;
        submittedAt: string | null;
        updatedAt: string;
        feedback: Array<{ id: string; content: string; createdAt: string }>;
      }>;
      nextCursor: string | null;
    };
    body: never;
    params: { id: string };
  };
  submission: {
    response: {
      id: string;
      versionId: string;
      userId: string;
      status: "draft" | "submitted" | "reviewed";
      content: string;
      completedStepIds: Array<string>;
      currentStepId: string;
      revision: number;
      submittedAt: string | null;
      updatedAt: string;
      feedback: Array<{ id: string; content: string; createdAt: string }>;
    };
    body: never;
    params: { id: string };
  };
  feedback: {
    response: {
      id: string;
      versionId: string;
      userId: string;
      status: "draft" | "submitted" | "reviewed";
      content: string;
      completedStepIds: Array<string>;
      currentStepId: string;
      revision: number;
      submittedAt: string | null;
      updatedAt: string;
      feedback: Array<{ id: string; content: string; createdAt: string }>;
    };
    body: { content: string };
    params: { id: string };
  };
  createBarrier: {
    response: {
      id: string;
      stepId: string;
      description: string;
      sharedWithTeacher: boolean;
      response: string | null;
      createdAt: string;
    };
    body: { description: string; sharedWithTeacher: boolean };
    params: { id: string };
  };
  barriers: {
    response: {
      items: Array<{
        id: string;
        stepId: string;
        description: string;
        sharedWithTeacher: boolean;
        response: string | null;
        createdAt: string;
      }>;
      nextCursor: string | null;
    };
    body: never;
    params: { id: string };
  };
  barrier: {
    response: {
      id: string;
      stepId: string;
      description: string;
      sharedWithTeacher: boolean;
      response: string | null;
      createdAt: string;
    };
    body: never;
    params: { id: string };
  };
  respondBarrier: {
    response: {
      id: string;
      stepId: string;
      description: string;
      sharedWithTeacher: boolean;
      response: string | null;
      createdAt: string;
    };
    body: { response: string };
    params: { id: string };
  };
  download: {
    response: { url: string; expiresIn: 60 };
    body: never;
    params: { id: string };
  };
  upload: { response: {}; body: {}; params: { id: string } };
  generate: {
    response: {
      id: string;
      missionId: string;
      status: "running" | "succeeded" | "failed" | "cancelled";
      outputVersionId: string | null;
      createdAt: string;
    };
    body: {
      materialIds: Array<string>;
      objectives: Array<string>;
      approvedForProvider: true;
      idempotencyKey: string;
    };
    params: { id: string };
  };
  generation: {
    response: {
      id: string;
      missionId: string;
      status: "running" | "succeeded" | "failed" | "cancelled";
      outputVersionId: string | null;
      createdAt: string;
    };
    body: never;
    params: { id: string };
  };
}
export const apiRoutes = {
  health: {
    method: "GET",
    path: "/health",
  },
  me: {
    method: "GET",
    path: "/me",
  },
  preferences: {
    method: "PATCH",
    path: "/me/preferences",
  },
  classrooms: {
    method: "GET",
    path: "/classrooms",
  },
  createClassroom: {
    method: "POST",
    path: "/classrooms",
  },
  members: {
    method: "GET",
    path: "/classrooms/{id}/members",
  },
  revokeMember: {
    method: "DELETE",
    path: "/classrooms/{id}/members/{memberId}",
  },
  invite: {
    method: "POST",
    path: "/classrooms/{id}/invitations",
  },
  revokeInvite: {
    method: "DELETE",
    path: "/classrooms/{id}/invitations/{invitationId}",
  },
  acceptInvite: {
    method: "POST",
    path: "/invitations/accept",
  },
  missions: {
    method: "GET",
    path: "/classrooms/{id}/missions",
  },
  createMission: {
    method: "POST",
    path: "/classrooms/{id}/missions",
  },
  mission: {
    method: "GET",
    path: "/missions/{id}",
  },
  editMission: {
    method: "PATCH",
    path: "/missions/{id}",
  },
  publish: {
    method: "POST",
    path: "/missions/{id}/publish",
  },
  archive: {
    method: "POST",
    path: "/missions/{id}/archive",
  },
  saveSubmission: {
    method: "POST",
    path: "/missions/{id}/submissions",
  },
  submissions: {
    method: "GET",
    path: "/missions/{id}/submissions",
  },
  submission: {
    method: "GET",
    path: "/submissions/{id}",
  },
  feedback: {
    method: "POST",
    path: "/submissions/{id}/feedback",
  },
  createBarrier: {
    method: "POST",
    path: "/steps/{id}/barriers",
  },
  barriers: {
    method: "GET",
    path: "/classrooms/{id}/barriers",
  },
  barrier: {
    method: "GET",
    path: "/barriers/{id}",
  },
  respondBarrier: {
    method: "POST",
    path: "/barriers/{id}/response",
  },
  download: {
    method: "GET",
    path: "/materials/{id}/download",
  },
  upload: {
    method: "POST",
    path: "/classrooms/{id}/uploads",
  },
  generate: {
    method: "POST",
    path: "/missions/{id}/ai-drafts",
  },
  generation: {
    method: "GET",
    path: "/ai-generations/{id}",
  },
} as const;
export type ApiResponse<K extends keyof ApiOperations> =
  ApiOperations[K]["response"];
export type ApiBody<K extends keyof ApiOperations> = ApiOperations[K]["body"];
