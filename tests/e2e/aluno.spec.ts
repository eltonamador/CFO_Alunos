import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Portal do Aluno - interface e progresso", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "aluno");
  });

  test("exibe as metricas de progresso na home", async ({ page }) => {
    const progressSection = page.locator("section").filter({ hasText: "Cadastro" }).first();

    await expect(progressSection.getByText("Cadastro", { exact: true })).toBeVisible();
    await expect(progressSection.getByText("Documentos", { exact: true })).toBeVisible();
    await expect(progressSection.getByText("Materiais (quarentena)", { exact: true })).toBeVisible();
    await expect(progressSection.getByText("Materiais (geral)", { exact: true })).toBeVisible();
    await expect(progressSection).toContainText(/\b100%/);
  });

  test("navega para a ficha e mostra as abas principais", async ({ page }) => {
    await page.goto("/aluno/ficha");

    await expect(page).toHaveURL(/\/aluno\/ficha/);
    await expect(page.getByRole("tab", { name: /Identifica/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Contato" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Saude|Saúde/i })).toBeVisible();

    await page.getByRole("tab", { name: /Saude|Saúde/i }).click();
    await expect(page).toHaveURL(/tab=saude/);
    await expect(page.getByLabel(/Tipo sanguineo|Tipo sanguíneo/i)).toBeVisible();
  });

  test("nao permite edicao de campos administrativos pelo aluno", async ({ page }) => {
    await page.goto("/aluno/ficha");
    await expect(page.getByRole("heading", { name: /PABLO/i })).toBeVisible();

    await expect(page.getByText(/Fase do CFO/i)).toBeVisible();
    await expect(page.getByText(/Canga/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Editar admin/i })).toHaveCount(0);
    await expect(page.locator('input[name="studentNumber"]')).toHaveCount(0);
    await expect(page.locator('select[name="pelotao"]')).toHaveCount(0);
  });
});
