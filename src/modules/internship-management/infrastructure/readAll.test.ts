import { expect, it, vi } from "vitest";
import { readAll } from "./readAll";
it("consulta todas as páginas de um histórico maior que o limite de uma página", async () => {
  const rows = Array.from({ length: 431 }, (_, id) => ({ id }));
  const page = vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, to + 1),
    error: null,
  }));
  expect(await readAll(page)).toEqual(rows);
  expect(page).toHaveBeenCalledTimes(3);
});
it("não recomenda com histórico incompleto quando uma página falha", async () => {
  const page = vi
    .fn()
    .mockResolvedValueOnce({ data: Array(200).fill({ id: 1 }), error: null })
    .mockResolvedValueOnce({ data: null, error: new Error("failed") });
  await expect(readAll(page)).rejects.toThrow("histórico completo");
});
