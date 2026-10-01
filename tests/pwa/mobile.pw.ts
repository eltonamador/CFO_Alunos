import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
});

test("reconexão preserva documento e campos preenchidos", async ({ page, context }) => {
  await page.getByLabel("Usuário").fill("consulta@example.invalid");
  const before = await page.evaluate(() => performance.timeOrigin);
  const navigated = page.waitForEvent("framenavigated", { timeout: 1500 }).then(
    () => true,
    (error) => {
      if (error.name === "TimeoutError") return false;
      throw error;
    },
  );
  await context.setOffline(true);
  await context.setOffline(false);
  // A second online event covers environments where network simulation is delayed.
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  expect(await navigated).toBe(false);
  await expect(page.getByLabel("Usuário")).toHaveValue("consulta@example.invalid");
  await expect.poll(() => page.evaluate(() => performance.timeOrigin)).toBe(before);
});

test("shell e consultas offline abrem sem rede nem respostas privadas em cache", async ({
  page,
  context,
}) => {
  const cached = await page.evaluate(async () => {
    const lists = await Promise.all(
      (await caches.keys()).map(async (name) =>
        (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname),
      ),
    );
    return lists.flat();
  });
  expect(cached).toContain("/offline.html");
  expect(cached).toContain("/qts-offline.html");
  expect(cached).toContain("/escala-offline.html");
  expect(cached.some((path) => /^\/(login|aluno|coordenacao|api)(\/|$)/.test(path))).toBe(false);
  expect(cached.some((path) => path.startsWith("/schedule-readers/"))).toBe(false);

  await context.setOffline(true);
  await page.goto("/aluno/ficha?tab=contato");
  await expect(page.getByRole("heading", { name: "Sem conexão com o sistema" })).toBeVisible();
  expect(page.url()).toContain("/aluno/ficha?tab=contato");
  await page.screenshot({ path: test.info().outputPath("offline-mobile.png"), fullPage: true });
  await page.getByRole("link", { name: "Consultar QTS salvo" }).click();
  await expect(
    page.getByRole("heading", { name: "Quadro de Trabalho Semanal salvo" }),
  ).toBeVisible();
});

test("RSC e APIs falham offline sem receber HTML do fallback", async ({ page, context }) => {
  await context.setOffline(true);
  const results = await page.evaluate(async () => {
    return Promise.all(
      [
        fetch("/aluno/ficha?_rsc=pwa-test", { headers: { RSC: "1" } }),
        fetch("/api/pwa-test-private"),
      ].map((response) =>
        response
          .then(async (r) => ({ html: (await r.text()).includes("Sem conexão com o sistema") }))
          .catch(() => ({ html: false })),
      ),
    );
  });
  expect(results).toEqual([{ html: false }, { html: false }]);
});
