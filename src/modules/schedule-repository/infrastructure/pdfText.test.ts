import PDFDocument from "pdfkit";
import { describe, expect, it } from "vitest";
import { extractSchedulePdfText } from "./pdfText";

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
