import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

const reports = [
  { title: "Ficha Completa da Turma", slug: "ficha-completa" },
  { title: "Pendencias de Enxoval", slug: "pendencias-enxoval" },
  { title: "Restricoes de Saude", slug: "saude" },
  { title: "Contatos de Emergencia", slug: "emergencia" },
] as const;

test.describe("Relatorios da turma", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "coordenacao");
    await page.goto("/coordenacao/relatorios");
  });

  for (const report of reports) {
    test(`${report.title} baixa XLSX e PDF reais`, async ({ page }) => {
      const card = page.getByTestId(`report-card-${report.slug}`);

      await expect(card).toBeVisible();

      const [xlsx] = await Promise.all([
        page.waitForEvent("download"),
        page.getByTestId(`download-${report.slug}-xlsx`).click(),
      ]);
      expect(xlsx.suggestedFilename()).toMatch(new RegExp(`${report.slug}|CFO2026`, "i"));
      expect(xlsx.suggestedFilename()).toMatch(/\.xlsx$/);

      const xlsxResponse = await page.request.get(`/api/reports/${report.slug}?format=xlsx`);
      expect(xlsxResponse.headers()["content-type"]).toContain(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect((await xlsxResponse.body()).subarray(0, 2).toString("utf8")).toBe("PK");

      const [pdf] = await Promise.all([
        page.waitForEvent("download"),
        page.getByTestId(`download-${report.slug}-pdf`).click(),
      ]);
      expect(pdf.suggestedFilename()).toMatch(new RegExp(`${report.slug}|CFO2026`, "i"));
      expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);

      const pdfResponse = await page.request.get(`/api/reports/${report.slug}?format=pdf`);
      expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
      expect((await pdfResponse.body()).subarray(0, 4).toString("utf8")).toBe("%PDF");
    });
  }
});
