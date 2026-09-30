// @vitest-environment node
import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { beachFooterLines, beachUnits } from "./internship-beach-guidance";
import { buildOperationalInternshipPDF } from "./internship-operational-pdf";
import type { OperationalInternshipScale } from "./internship-operational-scale";

const scale: OperationalInternshipScale = {
  service: "praia",
  programId: "test",
  programName: "CFO1",
  referenceCode: "TESTE",
  periodStart: "2026-09-27",
  periodEnd: "2026-09-27",
  issuedAt: "2026-09-25T15:00:00Z",
  rows: ["Fazendinha", "Santa Inês", "Araxá", "Cidade Nova", "Curiaú"].map((siteName, i) => ({
    shiftId: String(i),
    studentNumber: i + 1,
    warName: `CADETE ${i + 1}`,
    activityName: "Guarda-vidas",
    siteName,
    resourceName: "Posto",
    uniformCode: "4D",
    startsAt: "2026-09-27T13:00:00Z",
    endsAt: "2026-09-27T21:00:00Z",
    validatedMinutes: 0,
  })),
};

it("distingue responsabilidade de apresentação e preserva a decisão do supervisor", () => {
  expect(beachUnits("Santa Inês")).toEqual(beachUnits("Perpétuo Socorro"));
  expect(beachUnits("Cidade Nova")).toMatchObject({
    responsible: "SEC GAB (Gabinete)",
    presentation: "1º GBM",
  });
  expect(beachUnits("Fazendinha").presentation).toContain("supervisor define");
  expect(beachUnits("Santa Inês").presentation).toContain("supervisor define");
  expect(beachUnits("Araxá").presentation).toBe("1º GBM");
  expect(beachUnits("Curiaú").presentation).toBe("2º GBM");
  expect(beachUnits("Outro ponto").responsible).toBe("A confirmar");
});

it("restringe o CPA e os horários específicos à operação do manual", () => {
  expect(beachFooterLines(scale.rows)[0]).toContain("9h30");
  expect(beachFooterLines(scale.rows)[0]).toContain("Tenente Dorival");
  for (const rows of [
    [],
    [{ ...scale.rows[0]!, startsAt: "2026-10-04T13:00:00Z", endsAt: "2026-10-04T21:00:00Z" }],
    [{ ...scale.rows[0]!, startsAt: "2026-09-27T17:00:00Z" }],
  ]) {
    expect(beachFooterLines(rows)[0]).not.toMatch(/Dorival|9h30/);
    expect(beachFooterLines(rows)[0]).toContain("confirme horário e CPA");
  }
});

it("mantém os cinco pontos e as observações em uma página com ambas as assinaturas", async () => {
  for (const signatory of ["supervisor", "coordenador"] as const) {
    const pdf = await PDFDocument.load(await buildOperationalInternshipPDF(scale, signatory));
    expect(pdf.getPageCount()).toBe(1);
  }
});
