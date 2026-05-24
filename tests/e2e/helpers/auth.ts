import { expect, type Page } from "@playwright/test";

type Role = "coordenacao" | "aluno";

const DEFAULT_PASSWORD = "ChangeMe!2026";

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

  await page.getByLabel("E-mail").fill(email, { timeout: 10000 });
  await page.getByLabel("Senha").fill(password, { timeout: 10000 });
  await page.getByRole("button", { name: "Entrar" }).click({ force: true });

  await expect(page, `login de ${role} deve redirecionar para a home correta`).toHaveURL(homeUrl, {
    timeout: 10000,
  });
}
