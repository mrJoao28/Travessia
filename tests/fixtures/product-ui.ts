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
  workMode: "individual",
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
  groupId: null,
  status: "draft",
  content: "Planejamento inicial fictício.",
  completedStepIds: ["step-one"],
  currentStepId: "step-two",
  revision: 3,
  submittedAt: null,
  updatedAt: version.createdAt,
  gradingSteps: [],
  feedback: [],
};

export async function fixture(
  page: Page,
  role: "student" | "teacher" | "monitor",
  options: { multipleClassrooms?: boolean } = {},
) {
  let classroomArchivedAt: string | null = null;
  const createdClassrooms: { id: string; name: string; role: "teacher"; archivedAt: null; ownerId: string; isOwner: true }[] = [];
  const gradePeriods: ApiResponse<"gradePeriods">["items"] = [];
  const classroomChoices: ApiResponse<"classrooms">["items"] =
    role === "teacher" && options.multipleClassrooms
      ? [
          {
            id: "monitor-classroom",
            name: "Legislação",
            role: "monitor",
            archivedAt: null,
            isOwner: false,
          },
          {
            id: "test-classroom",
            name: "abacate",
            role: "teacher",
            archivedAt: null,
            ownerId: me.id,
            isOwner: true,
          },
        ]
      : [
          {
            id: "test-classroom",
            name: role === "student" ? "Programação I" : "Oficina de Projetos Inclusivos",
            role,
            archivedAt: null,
            ownerId: role === "teacher" ? me.id : undefined,
            isOwner: role === "teacher",
          },
        ];
  let mission: ApiResponse<"mission"> = {
    id: "test-mission",
    classroomId: "test-classroom",
    status: role === "student" ? "published" : "draft",
    draftVersion: role !== "student" ? version : null,
    publishedVersion: role === "student" ? version : null,
  };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.slice(
      "/api/v1".length,
    );
    const requestUrl = new URL(route.request().url());
    const respond = (body: unknown) => route.fulfill({ json: body });
    if (path.endsWith("/material-sources") || path.endsWith("/material-adaptations") || path.endsWith("/my-materials")) return respond({items:[]});
    if(path.endsWith("/strategy-recipients") || path.endsWith("/learning-needs")) return respond({items:[],nextCursor:null});
    if (path === "/me") return respond(me);
    if (path === "/activities/test-mission/my-adaptations") return respond({ versionId: version.id, items: [], allowedFormats: ["text"] });
    if (path === "/activities/test-mission/supports") return respond({ versionId: version.id, items: [] });
    if (path === "/activities/test-mission/groups") return respond({ items: [] });
    if (path === "/classrooms" && route.request().method() === "POST") {
      const body = route.request().postDataJSON() as ApiBody<"createClassroom">;
      const classroom = { id: `created-classroom-${createdClassrooms.length + 1}`, name: body.name, role: "teacher" as const, archivedAt: null, ownerId: me.id, isOwner: true as const };
      createdClassrooms.push(classroom);
      return respond(classroom);
    }
    if (path === "/classrooms" && route.request().method() === "GET")
      return respond({
        items: requestUrl.searchParams.get("view") === "archived"
          ? classroomArchivedAt && role === "teacher" ? [{
              id: "test-classroom", name: "Oficina de Projetos Inclusivos", role,
              archivedAt: classroomArchivedAt, ownerId: me.id, isOwner: true,
            }] : []
          : classroomArchivedAt ? [] : [
          ...classroomChoices,
          ...createdClassrooms,
        ],
        nextCursor: null,
      });
    if (path === "/classrooms/test-classroom" && route.request().method() === "DELETE")
      { classroomArchivedAt = version.createdAt; return respond({ archived: true, archivedAt: classroomArchivedAt }); }
    if (/^\/classrooms\/[^/]+\/activities$/.test(path))
      return respond({
        items: path === "/classrooms/test-classroom/activities" ? [mission] : [],
        nextCursor: null,
      });
    if (/^\/classrooms\/created-classroom-\d+\/activities$/.test(path))
      return respond({ items: [], nextCursor: null });
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
    if (path === "/classrooms/test-classroom/grade-periods" && route.request().method() === "GET")
      return respond({ items: gradePeriods });
    if (path === "/classrooms/test-classroom/grade-periods" && route.request().method() === "POST") {
      const body = route.request().postDataJSON() as ApiBody<"createGradePeriod">;
      const period = {
        id: `period-${gradePeriods.length + 1}`,
        classroomId: "test-classroom",
        name: body.name,
        formula: "weighted_average" as const,
        startsAt: null,
        endsAt: null,
        assessments: [],
      };
      gradePeriods.push(period);
      return respond(period);
    }
    if (/^\/grade-periods\/[^/]+\/assessments$/.test(path) && route.request().method() === "POST") {
      const periodId = path.split("/")[2];
      const body = route.request().postDataJSON() as ApiBody<"addGradeAssessment">;
      const target = gradePeriods.find((p) => p.id === periodId);
      const assessment = {
        id: `assessment-${(target?.assessments.length ?? 0) + 1}`,
        missionId: body.missionId,
        title: "Uma biblioteca para todos",
        weight: body.weight,
      };
      if (target) target.assessments.push(assessment);
      return respond(assessment);
    }
    if (/^\/grade-periods\/[^/]+\/gradebook$/.test(path) && route.request().method() === "GET") {
      const periodId = path.split("/")[2];
      const period = gradePeriods.find((p) => p.id === periodId) ?? {
        id: periodId,
        classroomId: "test-classroom",
        name: "Avaliação 1",
        formula: "weighted_average" as const,
        startsAt: null,
        endsAt: null,
        assessments: [],
      };
      return respond({
        period,
        students: [
          {
            studentId: "student-1",
            name: "Estudante Demonstração",
            assessments: period.assessments.map((a) => ({
              assessmentId: a.id,
              missionId: a.missionId,
              title: a.title,
              value: 9.0,
              weight: a.weight,
            })),
            average: period.assessments.length > 0 ? 9.0 : null,
          },
        ],
      });
    }
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
    if (path === "/activities/test-mission/submissions")
      return respond({
        items: role === "student" ? [submission] : [],
        nextCursor: null,
      });
    if (path === "/activities/test-mission" && route.request().method() === "GET")
      return respond(mission);
    if (path === "/activities/test-mission" && route.request().method() === "DELETE")
      return respond({ deleted: true });
    if (
      path === "/activities/test-mission" &&
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
    if (path === "/activities/test-mission/publish") {
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
