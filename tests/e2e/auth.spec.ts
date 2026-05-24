import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Autenticacao e redirecionamento", () => {
  test("Coordenacao consegue logar e e direcionada ao painel", async ({ page }) => {
    await loginAs(page, "coordenacao");

    await expect(page.getByRole("heading", { name: /Ola|Olá/i })).toBeVisible();
    await expect(page.getByText("Total de Alunos")).toBeVisible();
  });

  test("Aluno consegue logar e e direcionado ao seu portal", async ({ page }) => {
    await loginAs(page, "aluno");

    await expect(page.getByRole("heading", { name: /PABLO/i })).toBeVisible();
    await expect(page.getByText("Portal do Aluno", { exact: true })).toBeVisible();
  });
});
