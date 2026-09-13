import { getDocumentProxy } from "unpdf";
import { parseOfficerRosterItems, type OfficerIdentity, type OfficerTextItem } from "../domain/officerRoster";
import { ensurePdfRuntime } from "./pdfText";

export async function extractOfficerSchedulePdf(buffer: Uint8Array, identities: OfficerIdentity[]) {
  await ensurePdfRuntime();
  const document = await getDocumentProxy(new Uint8Array(buffer));
  try {
    const entries = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: OfficerTextItem[] = content.items.flatMap((item) =>
        "str" in item && "transform" in item && item.str.trim()
          ? [{ text: item.str, x: item.transform[4], y: item.transform[5] }]
          : [],
      );
      entries.push(...parseOfficerRosterItems(items, page.getViewport({ scale: 1 }).width, identities));
    }
    return entries.map((entry, index) => ({ ...entry, sequence: index + 1 }));
  } finally {
    await document.destroy();
  }
}
