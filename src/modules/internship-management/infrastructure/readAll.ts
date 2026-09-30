/** Read complete histories instead of silently ranking from a truncated API page. */
export async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  const size = 200;
  for (let from = 0; ; from += size) {
    const result = await page(from, from + size - 1);
    if (result.error || !result.data)
      throw new Error("Não foi possível consultar o histórico completo.");
    rows.push(...result.data);
    if (result.data.length < size) return rows;
  }
}
