import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
mkdirSync("public/schedule-readers", { recursive: true });
copyFileSync(
  join(dirname(require.resolve("pdfjs-dist/package.json")), "build/pdf.worker.min.mjs"),
  "public/schedule-readers/pdf.worker.min.mjs",
);
copyFileSync(
  join(dirname(require.resolve("tesseract.js/package.json")), "dist/worker.min.js"),
  "public/schedule-readers/ocr.worker.min.js",
);
