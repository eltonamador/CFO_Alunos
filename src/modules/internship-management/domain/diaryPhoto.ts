export const DIARY_PHOTO_MAX_BYTES = 1024 * 1024;
export const DIARY_PHOTO_RULE =
  "Envie apenas fotos autorizadas do plantão. Não inclua vítimas, pacientes, terceiros identificáveis, rostos, placas, documentos, endereços, dados de saúde ou cenas íntimas. Este diário é pessoal e extraoficial; a foto não substitui o registro oficial.";

/** Aceita JPEG comum e remove segmentos de metadados antes de persistir. */
export function cleanDiaryJpeg(input: Uint8Array): Uint8Array | null {
  if (input.length < 20 || input.length > DIARY_PHOTO_MAX_BYTES) return null;
  if (input[0] !== 0xff || input[1] !== 0xd8) return null;
  const kept: Uint8Array[] = [input.subarray(0, 2)];
  let position = 2;
  let width = 0;
  let height = 0;
  while (position + 4 <= input.length) {
    const start = position;
    if (input[position++] !== 0xff) return null;
    while (input[position] === 0xff) position++;
    const marker = input[position++];
    if (!marker || marker === 0xd9 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7))
      return null;
    if (position + 2 > input.length) return null;
    const length = (input[position]! << 8) | input[position + 1]!;
    if (length < 2 || position + length > input.length) return null;
    const end = position + length;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 7) return null;
      height = (input[position + 3]! << 8) | input[position + 4]!;
      width = (input[position + 5]! << 8) | input[position + 6]!;
    }
    if (marker === 0xda) {
      if (!width || !height || width > 2000 || height > 2000) return null;
      kept.push(input.subarray(start, end));
      let scan = end;
      while (scan + 1 < input.length) {
        if (input[scan] !== 0xff) { scan++; continue; }
        const next = input[scan + 1];
        if (next === 0x00 || (next! >= 0xd0 && next! <= 0xd7)) { scan += 2; continue; }
        if (next !== 0xd9) return null;
        kept.push(input.subarray(end, scan + 2));
        const clean = new Uint8Array(kept.reduce((sum, part) => sum + part.length, 0));
        let offset = 0;
        for (const part of kept) { clean.set(part, offset); offset += part.length; }
        return clean;
      }
      return null;
    }
    // APP0–APP15 e COM podem carregar EXIF, localização, XMP e perfis.
    if (!((marker >= 0xe0 && marker <= 0xef) || marker === 0xfe))
      kept.push(input.subarray(start, end));
    position = end;
  }
  return null;
}
