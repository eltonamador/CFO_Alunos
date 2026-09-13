import PDFDocument from "pdfkit";
import { describe, expect, it } from "vitest";
import { extractSchedulePdfText } from "./pdfText";
import { parseScheduleText } from "../domain/parser";

async function syntheticPdf(text: string) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const document = new PDFDocument({ compress: false });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    document.fontSize(24).text(text);
    document.end();
  });
}

describe("extração de PDF de escala", () => {
  it("extrai texto nativo de um PDF válido", async () => {
    const buffer = await syntheticPdf(
      "ESCALA DE ALUNO DE DIA 10/09/2026 CADETE SILVA TURMA CFO PRIMEIRO ANO",
    );
    const result = await extractSchedulePdfText(buffer, "native_text", "disabled");
    expect(result.extractionMethod).toBe("native_text");
    expect(result.text).toContain("CADETE SILVA");
    expect(result.pages).toBe(1);
  });

  it("sinaliza OCR quando o PDF não possui texto suficiente", async () => {
    const buffer = await syntheticPdf("PDF");
    await expect(extractSchedulePdfText(buffer, "native_text", "disabled")).rejects.toMatchObject({
      code: "OCR_REQUIRED",
    });
  });

  it("mantém cada registro em sua própria linha para associar pessoas e datas", async () => {
    const buffer = await syntheticPdf(
      "ESCALA DE SERVICO CFO\n10/09/2026 CADETE SILVA\n11/09/2026 CADETE SOUZA",
    );
    const extracted = await extractSchedulePdfText(buffer, "auto", "disabled");
    expect(extracted.text).toMatch(/SILVA\s*\n\s*11\/09\/2026/);
    const parsed = parseScheduleText(
      extracted.text,
      [
        { id: "a", studentNumber: 1, fullName: "João da Silva", warName: "SILVA" },
        { id: "b", studentNumber: 2, fullName: "Maria de Souza", warName: "SOUZA" },
      ],
      { referenceYear: 2026, defaultDutyFunction: "Aluno de Dia" },
    );
    expect(
      parsed.candidates.map(({ duty_date, matched_student_id }) => [duty_date, matched_student_id]),
    ).toEqual([
      ["2026-09-10", "a"],
      ["2026-09-11", "b"],
    ]);
  });

  it("distingue arquivo inválido de indisponibilidade do leitor", async () => {
    await expect(
      extractSchedulePdfText(new TextEncoder().encode("não é PDF"), "auto", "disabled"),
    ).rejects.toMatchObject({ code: "PDF_INVALID" });
  });

  it.runIf(process.env.TEST_LOCAL_OCR === "true")(
    "extrai texto de PDF digitalizado pelo adaptador local",
    async () => {
      const buffer = await syntheticPdf(
        "SCHEDULE OF STUDENT ON DUTY\n10/09/2026\nCADET SILVA\nFIRST YEAR CLASS",
      );
      const result = await extractSchedulePdfText(buffer, "ocr", "local_tesseract", "eng");
      expect(result.extractionMethod).toBe("ocr");
      expect(result.text.toUpperCase()).toContain("CADET SILVA");
    },
    60_000,
  );
});
