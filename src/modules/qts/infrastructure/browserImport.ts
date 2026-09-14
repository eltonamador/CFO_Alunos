import { parseQtsTokens, type QtsSourceToken } from "../domain/qtsParser";

export type BrowserQtsImport = ReturnType<typeof parseQtsTokens> & {
  file: File;
  pages: number;
  extractedText: string;
};

function isPdf(file: File) {
  return file.name.toLowerCase().endsWith(".pdf") && file.type !== "image/jpeg";
}

export async function readQtsFile(file: File, progress: (message: string) => void): Promise<BrowserQtsImport> {
  if (!isPdf(file)) throw new Error("Selecione o PDF original do QTS.");
  if (file.size > 20 * 1024 * 1024) throw new Error("O PDF excede o limite de 20 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("O arquivo selecionado não possui uma assinatura PDF válida.");
  if (!Promise.withResolvers)
    Promise.withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/schedule-readers/pdf.worker.min.mjs";
  const document = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  const tokens: QtsSourceToken[] = [];
  try {
    if (document.numPages > 15) throw new Error("Selecione um QTS com até 15 páginas.");
    for (let number = 1; number <= document.numPages; number++) {
      progress(`Lendo página ${number} de ${document.numPages}…`);
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        tokens.push({
          text: item.str,
          page: number,
          x: item.transform[4] / viewport.width,
          y: (viewport.height - item.transform[5] - item.height) / viewport.height,
        });
      }
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }
  const parsed = parseQtsTokens(tokens);
  return {
    ...parsed,
    file,
    pages: document.numPages,
    extractedText: tokens.map((token) => token.text).join(" ").slice(0, 100000),
  };
}
