import {expect,type Page} from "@playwright/test";
import type {ApiBody,ApiResponse} from "../../apps/web/lib/api.generated";

// Explicit controlled transport: these tests validate UI transitions, not the API/database.
export const me: ApiResponse<"me"> = {
  id: "test-user",
  name: "Pessoa fictícia",
  email: "ui-test@example.invalid",
  course: "Engenharia da Computação",
  demo: true,
  preferences: {},
};
export const version: NonNullable<ApiResponse<"mission">["publishedVersion"]> = {
  id: "version-current",
  missionId: "test-mission",
  title: "Uma biblioteca para todos",
  description: "Crie um sistema de empréstimo de livros.",
  objectives: ["Planejar uma solução."],
  criteria: ["Justificar as escolhas."],
  dueAt: null,
  source: "demo_fixture",
  createdAt: "2026-10-28T12:00:00.000Z",
  steps: [
    {
      id: "step-one",
      position: 1,
      title: "Compreender o problema",
      instructions: "Identifique as informações necessárias.",
      example: "Livro disponível e leitor.",
    },
    {
      id: "step-two",
      position: 2,
      title: "Planejar a solução",
      instructions: "Organize as funcionalidades.",
      example: "Comece por um empréstimo.",
    },
  ],
  materials: [
    {
      id: "material-one",
      title: "Exemplo fictício",
      text: "Conteúdo didático de teste.",
      hasFile: false,
    },
  ],
};
export const submission: ApiResponse<"submission"> = {
  id: "test-submission",
  versionId: version.id,
  userId: me.id,
  status: "draft",
  content: "Planejamento inicial fictício.",
  completedStepIds: ["step-one"],
  currentStepId: "step-two",
  revision: 3,
  submittedAt: null,
  updatedAt: version.createdAt,
  feedback: [],
};

export async function fixture(page: Page, role: "student" | "teacher") {
  let mission: ApiResponse<"mission"> = {
    id: "test-mission",
    classroomId: "test-classroom",
    status: role === "student" ? "published" : "draft",
    draftVersion: role === "teacher" ? version : null,
    publishedVersion: role === "student" ? version : null,
  };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.slice(
      "/api/v1".length,
    );
    const respond = (body: unknown) => route.fulfill({ json: body });
    if (path.endsWith("/material-sources") || path.endsWith("/material-adaptations") || path.endsWith("/my-materials")) return respond({items:[]});
    if(path.endsWith("/strategy-recipients") || path.endsWith("/learning-needs")) return respond({items:[],nextCursor:null});
    if (path === "/me") return respond(me);
    if (path === "/missions/test-mission/my-adaptations") return respond({ versionId: version.id, items: [], allowedFormats: ["text"] });
    if (path === "/missions/test-mission/supports") return respond({ versionId: version.id, items: [] });
    if (path === "/classrooms")
      return respond({
        items: [
          {
            id: "test-classroom",
            name:
              role === "student"
                ? "Programação I"
                : "Oficina de Projetos Inclusivos",
            role,
          },
        ],
        nextCursor: null,
      });
    if (path === "/classrooms/test-classroom/missions")
      return respond({ items: [mission], nextCursor: null });
    if (path === "/classrooms/test-classroom/members")
      return respond({
        items: [
          {
            id: "test-membership",
            name: "Pessoa fictícia",
            role: "teacher",
            active: true,
          },
        ],
        nextCursor: null,
      });
    if (path === "/classrooms/test-classroom/invitations" && route.request().method() === "GET") return respond({items:[],nextCursor:null});
    if (
      path === "/classrooms/test-classroom/invitations" &&
      route.request().method() === "POST"
    )
      return respond({
        id: "test-invitation",
        token: "a".repeat(64),
        code: "ABCD2345", reusable: true, createdAt: version.createdAt,
        expiresAt: version.createdAt,
      });
    if (
      path === "/classrooms/test-classroom/invitations/test-invitation" &&
      route.request().method() === "DELETE"
    ) {
      expect(route.request().headers()["content-type"]).toBe(
        "application/json",
      );
      return respond({ revoked: true });
    }
    if (path === "/missions/test-mission/submissions")
      return respond({
        items: role === "student" ? [submission] : [],
        nextCursor: null,
      });
    if (path === "/missions/test-mission" && route.request().method() === "GET")
      return respond(mission);
    if (
      path === "/missions/test-mission" &&
      route.request().method() === "PATCH"
    ) {
      const body = route.request().postDataJSON() as ApiBody<"editMission">;
      expect(body.expectedDraftVersionId).toBe(version.id);
      mission = {
        ...mission,
        draftVersion: {
          ...version,
          id: "saved-version",
          source: "manual",
          title: body.title,
          description: body.description,
          objectives: body.objectives,
          criteria: body.criteria,
          dueAt: body.dueAt ?? null,
          steps: body.steps.map((step, index) => ({
            ...step,
            id: `saved-step-${index}`,
            position: index + 1,
          })),
          materials: body.materials.map((material, index) => ({
            ...material,
            id: `saved-material-${index}`,
            hasFile: false,
          })),
        },
      };
      return respond(mission);
    }
    if (path === "/missions/test-mission/publish") {
      const body = route.request().postDataJSON() as ApiBody<"publish">;
      expect(body).toEqual({ versionId: "saved-version", reviewed: true });
      mission = {
        ...mission,
        status: "published",
        publishedVersion: mission.draftVersion,
        draftVersion: null,
      };
      return respond(mission);
    }
    return route.fulfill({
      status: 503,
      json: { code: "AI_UNAVAILABLE", message: "Indisponível no teste." },
    });
  });
}
