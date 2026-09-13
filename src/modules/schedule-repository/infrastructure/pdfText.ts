import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { configureUnPDF, extractText, getDocumentProxy } from "unpdf";

const execFileAsync = promisify(execFile);
const MIN_NATIVE_TEXT_LENGTH = 40;
let pdfConfigured = false;

export async function ensurePdfRuntime() {
  if (pdfConfigured) return;
  await configureUnPDF({ pdfjs: () => import("pdfjs-dist/legacy/build/pdf.mjs") });
  pdfConfigured = true;
}

export class ScheduleExtractionError extends Error {
  constructor(
    public readonly code:
      | "OCR_REQUIRED"
      | "PDF_INVALID"
      | "PDF_READ_FAILED"
      | "PDF_WORKER_UNAVAILABLE"
      | "OCR_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "ScheduleExtractionError";
  }
}

async function extractNativeText(buffer: Uint8Array) {
  try {
    await ensurePdfRuntime();
    // PDF.js pode transferir o ArrayBuffer para o worker; preserve o original para o OCR.
    const document = await getDocumentProxy(new Uint8Array(buffer));
    try {
      const result = await extractText(document);
      return { text: result.text.join("\n"), pages: result.totalPages };
    } finally {
      await document.destroy();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível ler o PDF.";
    const code = /worker|pdf\.worker/i.test(message)
      ? "PDF_WORKER_UNAVAILABLE"
      : error instanceof Error &&
          /InvalidPDFException|MissingPDFException|PasswordException/.test(error.name)
        ? "PDF_INVALID"
        : "PDF_READ_FAILED";
    throw new ScheduleExtractionError(code, message);
  }
}

async function extractWithLocalTesseract(buffer: Uint8Array, language: string) {
  const directory = await mkdtemp(join(tmpdir(), "cfo-schedule-ocr-"));
  try {
    const input = join(directory, "document.pdf");
    const prefix = join(directory, "page");
    await writeFile(input, buffer);
    await execFileAsync("pdftoppm", ["-png", "-r", "200", input, prefix], {
      timeout: 45_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const pages = (await readdir(directory)).filter((name) => /^page-\d+\.png$/.test(name)).sort();
    const text: string[] = [];
    for (const page of pages) {
      const result = await execFileAsync(
        "tesseract",
        [join(directory, page), "stdout", "-l", language],
        {
          timeout: 45_000,
          maxBuffer: 8 * 1024 * 1024,
        },
      );
      text.push(result.stdout);
    }
    if (!text.join("").trim()) throw new Error("OCR não encontrou texto nas páginas.");
    return { text: text.join("\n"), pages: pages.length, extractionMethod: "ocr" as const };
  } catch (error) {
    throw new ScheduleExtractionError(
      "OCR_FAILED",
      error instanceof Error ? error.message : "Falha no OCR local.",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function extractSchedulePdfText(
  buffer: Uint8Array,
  method: "auto" | "native_text" | "ocr",
  ocrProvider: "disabled" | "local_tesseract",
  ocrLanguage = "por",
) {
  if (method !== "ocr") {
    const native = await extractNativeText(buffer);
    if (native.text.trim().length >= MIN_NATIVE_TEXT_LENGTH) {
      return { ...native, extractionMethod: "native_text" as const };
    }
    if (method === "native_text") {
      throw new ScheduleExtractionError(
        "OCR_REQUIRED",
        "O PDF não contém texto nativo suficiente para processamento.",
      );
    }
  }
  if (ocrProvider === "local_tesseract") return extractWithLocalTesseract(buffer, ocrLanguage);
  throw new ScheduleExtractionError(
    "OCR_REQUIRED",
    "O PDF parece digitalizado e o provedor de OCR ainda não está habilitado.",
  );
}
