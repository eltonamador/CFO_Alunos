import { expect, type Page } from "@playwright/test";

type Role = "coordenacao" | "aluno";

const DEFAULT_PASSWORD = "ChangeMe!2026";
const FIRST_ACCESS_PASSWORD = process.env.E2E_FIRST_ACCESS_PASSWORD ?? "E2EOnly!2026";

const credentials: Record<Role, { email: string; password: string; homeUrl: RegExp }> = {
  coordenacao: {
    email: process.env.E2E_COORD_EMAIL ?? "coordenacao@abm.br",
    password: process.env.E2E_COORD_PASSWORD ?? DEFAULT_PASSWORD,
    homeUrl: /\/coordenacao$/,
  },
  aluno: {
    email: process.env.E2E_ALUNO_EMAIL ?? "pablo@abm.br",
    password: process.env.E2E_ALUNO_PASSWORD ?? DEFAULT_PASSWORD,
    homeUrl: /\/aluno$/,
  },
};

export async function loginAs(page: Page, role: Role) {
  const { email, password, homeUrl } = credentials[role];

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  if (homeUrl.test(page.url())) return;

  async function submitLogin(candidatePassword: string) {
    await page.getByLabel("E-mail").fill(email, { timeout: 10000 });
    await page.getByLabel("Senha").fill(candidatePassword, { timeout: 10000 });
    await page.getByRole("button", { name: "Entrar" }).click({ force: true });
    await page
      .waitForURL(/\/(primeiro-acesso|coordenacao|aluno)$/, { timeout: 5000 })
      .catch(() => undefined);
  }

  await submitLogin(password);
  if (/\/login$/.test(page.url()) && password !== FIRST_ACCESS_PASSWORD) {
    await submitLogin(FIRST_ACCESS_PASSWORD);
  }

  if (/\/primeiro-acesso$/.test(page.url())) {
    await page.getByLabel("Nova senha").fill(FIRST_ACCESS_PASSWORD);
    await page.getByLabel("Confirmar senha").fill(FIRST_ACCESS_PASSWORD);
    await page.getByRole("button", { name: "Definir nova senha" }).click();
  }

  await expect(page, `login de ${role} deve redirecionar para a home correta`).toHaveURL(homeUrl, {
    timeout: 10000,
  });
}
