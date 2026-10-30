import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { ApiBody, ApiResponse } from "../../apps/web/lib/api.generated";

// Explicit controlled transport: these tests validate UI transitions, not the API/database.
const me: ApiResponse<"me"> = {
  id: "test-user",
  name: "Pessoa fictícia",
  email: "ui-test@example.invalid",
  course: "Engenharia da Computação",
  demo: true,
  preferences: {},
};
const version: NonNullable<ApiResponse<"mission">["publishedVersion"]> = {
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
const submission: ApiResponse<"submission"> = {
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

async function fixture(page: Page, role: "student" | "teacher") {
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
    if (
      path === "/classrooms/test-classroom/invitations" &&
      route.request().method() === "POST"
    )
      return respond({
        id: "test-invitation",
        token: "a".repeat(64),
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
test("rascunho aguarda confirmação, bloqueia edição concorrente e preserva texto no conflito", async ({
  page,
}) => {
  await fixture(page, "student");
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/v1/missions/test-mission/submissions",
    async (route) => {
      if (route.request().method() === "GET") return route.fallback();
      const body = route.request().postDataJSON() as ApiBody<"saveSubmission">;
      expect(body.expectedRevision).toBe(3);
      expect(body.currentStepId).toBe("step-two");
      expect(body).not.toHaveProperty("userId");
      await held;
      await route.fulfill({
        status: 409,
        json: { code: "REVISION_CONFLICT", message: "Versão alterada." },
      });
    },
  );
  await page.goto("/aluno/missoes/test-mission");
  await expect(page.getByLabel("Planejamento e atividade")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByLabel("Planejamento e atividade")
    .fill("Meu planejamento preservado.");
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page.getByLabel("Planejamento e atividade")).toBeDisabled();
  await expect(
    page.getByText("Rascunho e etapa atual salvos no servidor.", {
      exact: true,
    }),
  ).toHaveCount(0);
  release();
  await expect(page.getByText(/O conteúdo mudou no servidor/)).toBeVisible();
  await expect(page.getByLabel("Planejamento e atividade")).toHaveValue(
    "Meu planejamento preservado.",
  );
  await expect(page.getByLabel("Planejamento e atividade")).toBeEnabled();
});
test("editor salva versão, exige revisão e publica somente a versão confirmada — transporte controlado", async ({
  page,
}) => {
  await fixture(page, "teacher");
  await page.goto("/professor/missoes/test-mission/editar");
  await page
    .getByLabel("Título da missão", { exact: true })
    .fill("Missão revisada de teste");
  await page
    .getByRole("button", { name: "Salvar e revisar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisão antes de publicar" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Publicar missão", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Revisei objetivos, critérios, etapas e materiais.")
    .check();
  await page
    .getByRole("button", { name: "Publicar missão", exact: true })
    .click();
  await expect(
    page.getByText(
      "Missão publicada pelo servidor e disponível para a turma.",
      { exact: true },
    ),
  ).toBeVisible();
});
test("Gemini indisponível preserva planejamento e permite continuar manualmente", async ({
  page,
}) => {
  await fixture(page, "teacher");
  await page.goto("/professor/missoes/test-mission/editar");
  await page.getByLabel("Exemplo fictício", { exact: true }).check();
  await page
    .getByLabel(
      "Revisei os textos selecionados e autorizo seu envio ao provedor.",
    )
    .check();
  await page
    .getByRole("button", { name: "Solicitar rascunho", exact: true })
    .click();
  await expect(
    page.getByText(
      "A assistência está desativada. Você pode continuar editando manualmente.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel("Título da missão", { exact: true }),
  ).toHaveValue(version.title);
  await expect(
    page.getByLabel("Título da missão", { exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Salvar rascunho", exact: true }),
  ).toBeEnabled();
});

test("convite usa vínculo docente e revogação envia JSON ao proxy — transporte controlado", async ({
  page,
}) => {
  await fixture(page, "teacher");
  await page.goto("/professor");
  await page.getByRole("button", { name: "Gerar convite de aluno" }).click();
  await expect(page.getByLabel("Código de convite")).toHaveValue(
    "a".repeat(64),
  );
  await page.getByRole("button", { name: "Revogar este convite" }).click();
  await expect(
    page.getByText("Convite revogado pelo servidor.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Código de convite")).toHaveCount(0);
});
