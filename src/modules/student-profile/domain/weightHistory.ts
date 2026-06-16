export interface WeightHistoryEntry {
  id: string;
  weight_kg: number;
  measured_at: string;
  created_at: string;
}

export interface WeightSummary {
  currentWeightKg: number | null;
  lastMeasuredAt: string | null;
  count: number;
  variationKg: number | null;
}

export function normalizeWeightInput(input: string | number): number {
  const raw = typeof input === "number" ? String(input) : input.trim().replace(",", ".");
  if (raw.length === 0) throw new Error("Peso obrigatorio.");

  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error("Peso invalido.");
  if (value < 30 || value > 300) throw new Error("Peso entre 30 e 300 kg.");

  return Math.round(value * 100) / 100;
}

function compareEntriesAsc(a: WeightHistoryEntry, b: WeightHistoryEntry): number {
  const measured = a.measured_at.localeCompare(b.measured_at);
  if (measured !== 0) return measured;
  return a.created_at.localeCompare(b.created_at);
}

export function sortWeightHistoryForChart(entries: WeightHistoryEntry[]): WeightHistoryEntry[] {
  return [...entries].sort(compareEntriesAsc);
}

export function getLatestWeightEntry(entries: WeightHistoryEntry[]): WeightHistoryEntry | null {
  const sorted = sortWeightHistoryForChart(entries);
  return sorted.at(-1) ?? null;
}

export function buildWeightSummary(entries: WeightHistoryEntry[]): WeightSummary {
  if (entries.length === 0) {
    return {
      currentWeightKg: null,
      lastMeasuredAt: null,
      count: 0,
      variationKg: null,
    };
  }

  const sorted = sortWeightHistoryForChart(entries);
  const first = sorted[0]!;
  const latest = sorted.at(-1)!;

  return {
    currentWeightKg: latest.weight_kg,
    lastMeasuredAt: latest.measured_at,
    count: sorted.length,
    variationKg: Math.round((latest.weight_kg - first.weight_kg) * 100) / 100,
  };
}
