import { describe, expect, it } from "vitest";
import {
  buildWeightSummary,
  buildWeightTimeline,
  getLatestWeightEntry,
  normalizeWeightInput,
  sortWeightHistoryForChart,
  type WeightHistoryEntry,
} from "./weightHistory";

const entries: WeightHistoryEntry[] = [
  {
    id: "a",
    weight_kg: 78.2,
    measured_at: "2026-03-01",
    created_at: "2026-03-01T10:00:00.000Z",
  },
  {
    id: "b",
    weight_kg: 79.1,
    measured_at: "2026-04-01",
    created_at: "2026-04-01T10:00:00.000Z",
  },
  {
    id: "c",
    weight_kg: 78.8,
    measured_at: "2026-04-01",
    created_at: "2026-04-01T15:00:00.000Z",
  },
];

describe("weight history domain helpers", () => {
  it("normalizes decimal weights with comma or dot", () => {
    expect(normalizeWeightInput("78,5")).toBe(78.5);
    expect(normalizeWeightInput("78.5")).toBe(78.5);
    expect(normalizeWeightInput(78.55)).toBe(78.55);
  });

  it("rejects empty, negative and absurd weights", () => {
    expect(() => normalizeWeightInput("")).toThrow("Peso obrigatorio.");
    expect(() => normalizeWeightInput("-1")).toThrow("Peso entre 30 e 300 kg.");
    expect(() => normalizeWeightInput("301")).toThrow("Peso entre 30 e 300 kg.");
    expect(() => normalizeWeightInput("abc")).toThrow("Peso invalido.");
  });

  it("returns latest weight by measured date and creation time", () => {
    expect(getLatestWeightEntry(entries)).toMatchObject({
      id: "c",
      weight_kg: 78.8,
    });
  });

  it("sorts chart points from oldest to newest", () => {
    expect(sortWeightHistoryForChart([entries[1]!, entries[0]!, entries[2]!]).map((e) => e.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("builds a compact summary", () => {
    expect(buildWeightSummary(entries)).toEqual({
      currentWeightKg: 78.8,
      lastMeasuredAt: "2026-04-01",
      count: 3,
      variationKg: 0.6,
      previousVariationKg: -0.3,
    });
  });

  it("builds an empty summary when history is empty", () => {
    expect(buildWeightSummary([])).toEqual({
      currentWeightKg: null,
      lastMeasuredAt: null,
      count: 0,
      variationKg: null,
      previousVariationKg: null,
    });
  });

  it("has no previous variation with a single entry", () => {
    const summary = buildWeightSummary([entries[0]!]);
    expect(summary.variationKg).toBe(0);
    expect(summary.previousVariationKg).toBeNull();
  });

  it("builds a timeline from newest to oldest with per-entry deltas", () => {
    expect(buildWeightTimeline(entries).map((e) => [e.id, e.deltaKg])).toEqual([
      ["c", -0.3],
      ["b", 0.9],
      ["a", null],
    ]);
  });

  it("builds an empty timeline when history is empty", () => {
    expect(buildWeightTimeline([])).toEqual([]);
  });
});
