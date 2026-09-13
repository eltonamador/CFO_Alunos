import { PDFDocument } from "pdf-lib";
import type { Worker } from "tesseract.js";
import type { ImportOfficer, ImportRow, ImportStudent, ImportToken } from "../domain/importPreview";
import { previewCadetTable } from "../domain/importPreview";
import { parseOfficerRosterItems } from "../domain/officerRoster";
import { prepareOcrPixels } from "./prepareOcrPixels";

export interface BrowserImportResult {
  file: File;
  rows: ImportRow[];
  text: string;
  pages: number;
  method: string;
}

export async function readScheduleFile(
  file: File,
  students: ImportStudent[],
  officers: ImportOfficer[],
  defaultFunction: string,
  progress: (message: string) => void,
): Promise<BrowserImportResult> {
  if (file.size > 20 * 1024 * 1024) throw new Error("O arquivo excede 20 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  const image = /^image\/(jpeg|png|webp)$/.test(file.type);
  if (!pdf && !image)
    throw new Error("Selecione um PDF, JPG, PNG ou WebP. Para HEIC, exporte a foto como JPG.");
  const tokens: ImportToken[] = [],
    officerRows: ImportRow[] = [];
  let outputFile = file,
    pages = 1,
    usedOcr = false;
  let worker: Worker | null = null;
  async function recognize(canvas: HTMLCanvasElement, page: number) {
    usedOcr = true;
    const context = canvas.getContext("2d");
    if (context) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      prepareOcrPixels(pixels.data, canvas.width, canvas.height);
      context.putImageData(pixels, 0, 0);
    }
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("por", 1, {
        workerPath: "/schedule-readers/ocr.worker.min.js",
        logger: (message) => {
          if (message.status === "recognizing text")
            progress(`Lendo página ${page}: ${Math.round(message.progress * 100)}%`);
        },
      });
    }
    const result = await worker.recognize(canvas, {}, { blocks: true });
    for (const block of result.data.blocks ?? [])
      for (const paragraph of block.paragraphs)
        for (const line of paragraph.lines)
          for (const word of line.words) {
            tokens.push({
              text: word.text,
              page,
              x: word.bbox.x0 / canvas.width,
              y: word.bbox.y0 / canvas.height,
              width: (word.bbox.x1 - word.bbox.x0) / canvas.width,
              height: (word.bbox.y1 - word.bbox.y0) / canvas.height,
            });
          }
  }
  try {
    if (pdf) {
      // Compatibilidade com versões do Safari anteriores a Promise.withResolvers.
      if (!Promise.withResolvers)
        Promise.withResolvers = function <T>() {
          let resolve!: (value: T | PromiseLike<T>) => void, reject!: (reason?: unknown) => void;
          const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
          });
          return { promise, resolve, reject };
        };
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/schedule-readers/pdf.worker.min.mjs";
      const document = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false })
        .promise;
      try {
        pages = document.numPages;
        if (pages > 15)
          throw new Error("Selecione um PDF com até 15 páginas de escala para esta importação.");
        for (let number = 1; number <= pages; number++) {
          progress(`Lendo página ${number} de ${pages}…`);
          const page = await document.getPage(number),
            viewport = page.getViewport({ scale: 1 });
          const content = await page.getTextContent();
          const items = content.items.flatMap((item) =>
            "str" in item && item.str.trim() ? [item] : [],
          );
          const recognized = parseOfficerRosterItems(
            items.map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5] })),
            viewport.width,
            officers.map((officer) => ({
              serviceAlias: officer.person,
              profileId: officer.profileId,
            })),
          );
          officerRows.push(
            ...recognized.map((entry) => ({
              kind: "officer" as const,
              person: entry.display_name,
              studentId: "",
              profileId: entry.profile_id ?? "",
              date: entry.duty_date,
              dutyFunction: entry.duty_function,
              shift: entry.shift,
              startsAt: entry.starts_at,
              endsAt: entry.ends_at,
              sourceLine: entry.source_line,
            })),
          );
          if (items.reduce((count, item) => count + item.str.length, 0) > 40) {
            tokens.push(
              ...items.map((item) => ({
                text: item.str,
                page: number,
                x: item.transform[4] / viewport.width,
                y: (viewport.height - item.transform[5] - item.height) / viewport.height,
                width: item.width / viewport.width,
                height: item.height / viewport.height,
              })),
            );
          } else {
            const render = page.getViewport({
              scale: Math.min(2, 2200 / Math.max(viewport.width, viewport.height)),
            });
            const surface = window.document.createElement("canvas");
            surface.width = render.width;
            surface.height = render.height;
            const context = surface.getContext("2d");
            if (!context) throw new Error("Não foi possível ler a imagem do PDF.");
            await page.render({ canvasContext: context, viewport: render }).promise;
            await recognize(surface, number);
            surface.width = 0;
            surface.height = 0;
          }
          page.cleanup();
        }
      } finally {
        await document.destroy();
      }
    } else {
      progress("Preparando a foto…");
      const url = URL.createObjectURL(file);
      try {
        const picture = new Image();
        picture.src = url;
        await picture.decode();
        const ratio = Math.min(1, 2600 / Math.max(picture.naturalWidth, picture.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(picture.naturalWidth * ratio);
        canvas.height = Math.round(picture.naturalHeight * ratio);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Não foi possível abrir a foto.");
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(picture, 0, 0, canvas.width, canvas.height);
        const originalPng = file.type === "image/webp" ? canvas.toDataURL("image/png") : null;
        await recognize(canvas, 1);
        const archive = await PDFDocument.create();
        const embedded =
          file.type === "image/jpeg"
            ? await archive.embedJpg(bytes)
            : file.type === "image/png"
              ? await archive.embedPng(bytes)
              : await archive.embedPng(originalPng!);
        const sheet = archive.addPage([embedded.width, embedded.height]);
        sheet.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        const archivedBytes = await archive.save();
        outputFile = new File(
          [new Uint8Array(archivedBytes)],
          `${file.name.replace(/\.[^.]+$/, "")}.pdf`,
          { type: "application/pdf" },
        );
        canvas.width = 0;
        canvas.height = 0;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const rows = officerRows.length
      ? officerRows
      : previewCadetTable(tokens, students, defaultFunction);
    if (rows.length > 500)
      throw new Error("A extração excedeu 500 linhas. Divida a escala em arquivos menores.");
    return {
      file: outputFile,
      rows,
      pages,
      method: usedOcr ? "browser_ocr" : "native_text",
      text: tokens
        .map((token) => token.text)
        .join(" ")
        .slice(0, 100000),
    };
  } finally {
    if (worker) await (worker as Worker).terminate();
  }
}
