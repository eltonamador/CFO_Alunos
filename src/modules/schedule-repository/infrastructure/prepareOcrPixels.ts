/** A leitura usa uma cópia com maior contraste; o documento arquivado permanece original. */
export function prepareOcrPixels(pixels: Uint8ClampedArray, width: number, height: number) {
  for (let y = 0; y < height; y++) {
    let dark = 0;
    if (y < height / 3)
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        if (Math.max(pixels[index]!, pixels[index + 1]!, pixels[index + 2]!) < 160) dark++;
      }
    const header = dark > width * 0.55;
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const maximum = Math.max(pixels[index]!, pixels[index + 1]!, pixels[index + 2]!);
      const minimum = Math.min(pixels[index]!, pixels[index + 1]!, pixels[index + 2]!);
      // Grades coloridas deixam de ser confundidas com barras e partes das letras.
      const value = header
        ? minimum > 165
          ? 0
          : 255
        : maximum < 145 && maximum - minimum < 45
          ? 0
          : 255;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
    }
  }
}
