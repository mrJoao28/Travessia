import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { ApiBody, ApiResponse } from "../../apps/web/lib/api.generated";

import {fixture,me,version,submission} from "../fixtures/product-ui";

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
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
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
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await page.getByText('Pedir ajuda à IA para escrever a missão (opcional)', { exact: true }).click();
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
  await page.getByText('Alunos da turma e convites', { exact: true }).click();
  await page.getByRole("button", { name: "Gerar convite de aluno" }).click();
  await expect(page.getByLabel("Código de convite")).toHaveValue(
    "ABCD2345",
  );
  await page.getByText("Convites ativos · 1", { exact: true }).click();
  await page.getByRole("button", { name: /^Desativar convite criado/ }).click();
  await expect(
    page.getByText("Convite desativado. O código e o link deixam de aceitar novas entradas. Quem já entrou continua na turma.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Código de convite")).toHaveCount(0);
});

test('preparação guiada valida a etapa atual, volta por teclado e preserva conteúdo quando salvar falha', async ({ page }) => {
  await fixture(page, 'teacher');
  await page.goto('/professor/missoes/test-mission/editar');
  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link')).toHaveCount(3);
  await page.getByLabel('Título da missão', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await expect(page.getByLabel('Título da missão', { exact: true })).toBeFocused();
  await page.getByLabel('Título da missão', { exact: true }).fill('Missão que quero preservar');
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  const instruction = page.getByRole('textbox', { name: 'Instrução', exact: true }).first();
  await instruction.fill('');
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await expect(instruction).toBeFocused();
  await instruction.fill('Compare as alternativas antes de escolher.');
  await page.getByRole('button', { name: '← Voltar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Título da missão', { exact: true })).toHaveValue('Missão que quero preservar');
  await page.getByRole('button', { name: 'Continuar para as etapas →', exact: true }).click();
  await expect(instruction).toHaveValue('Compare as alternativas antes de escolher.');
  await page.route('**/api/v1/missions/test-mission', async route => route.request().method() === 'PATCH' ? route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT' } }) : route.fallback());
  await page.getByRole('button', { name: 'Salvar e continuar →', exact: true }).click();
  await expect(page.getByText(/O conteúdo mudou no servidor/)).toBeVisible();
  await expect(instruction).toHaveValue('Compare as alternativas antes de escolher.');
  await expect(page.getByRole('button', { name: 'Salvar e continuar →', exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 320, height: 850 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});


test('PDF selecionado permanece no campo ao voltar e ao recusar outro arquivo',async({page})=>{
 await fixture(page,'teacher');await page.goto('/professor/missoes/test-mission/editar');
 await page.getByRole('button',{name:'Continuar para as etapas →',exact:true}).click();
 const field=page.getByLabel('Adicionar PDF à missão',{exact:true});
 const pdf={name:'material-escolhido.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nfixture')};
 await field.setInputFiles(pdf);
 const filename=()=>field.evaluate((node:HTMLInputElement)=>node.files?.[0]?.name??'');
 await expect.poll(filename).toBe(pdf.name);
 await expect(page.getByText(/PDF escolhido: material-escolhido.pdf/)).toBeVisible();
 await page.getByRole('button',{name:'← Voltar',exact:true}).click();
 await page.getByRole('button',{name:'Continuar para as etapas →',exact:true}).click();
 await expect.poll(filename).toBe(pdf.name);
 await field.setInputFiles({name:'arquivo-invalido.txt',mimeType:'text/plain',buffer:Buffer.from('Texto')});
 await expect(page.getByText('Escolha um PDF de até 10 MB.',{exact:true})).toBeVisible();
 await expect.poll(filename).toBe(pdf.name);
 await field.setInputFiles([]);await expect.poll(filename).toBe(pdf.name);
 await field.setInputFiles({...pdf,name:'outro-material.pdf'});
 await expect.poll(filename).toBe('outro-material.pdf');
 await expect(page.getByText(/PDF escolhido: outro-material.pdf/)).toBeVisible();
});
