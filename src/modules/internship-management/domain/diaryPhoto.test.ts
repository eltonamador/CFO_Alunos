import { describe, expect, it } from "vitest";
import { cleanDiaryJpeg, DIARY_PHOTO_MAX_BYTES } from "./diaryPhoto";

// JPEG baseline mínimo para testar a remoção dos segmentos que carregam metadados.
const marker = (...bytes: number[]) => bytes;
const jpeg = new Uint8Array([
  ...marker(0xff, 0xd8),
  ...marker(0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00),
  ...marker(0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00),
  ...marker(0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00),
  ...marker(0x11, 0x22, 0xff, 0xd9),
]);

describe("fotos do diário", () => {
  it("remove EXIF antes de persistir e ignora dados anexados após o fim da imagem", () => {
    const result = cleanDiaryJpeg(new Uint8Array([...jpeg, 0x01, 0x02]));
    expect(result).not.toBeNull();
    expect(Buffer.from(result!).includes(Buffer.from("Exif"))).toBe(false);
    expect([...result!.slice(-2)]).toEqual([0xff, 0xd9]);
  });

  it("recusa conteúdo inválido, metadados após o início da imagem e tamanho excessivo", () => {
    expect(cleanDiaryJpeg(new Uint8Array([1, 2, 3]))).toBeNull();
    const unexpectedMarker = new Uint8Array([...jpeg.slice(0, -2), 0xff, 0xe1, 0xff, 0xd9]);
    expect(cleanDiaryJpeg(unexpectedMarker)).toBeNull();
    expect(cleanDiaryJpeg(new Uint8Array(DIARY_PHOTO_MAX_BYTES + 1))).toBeNull();
  });
});
