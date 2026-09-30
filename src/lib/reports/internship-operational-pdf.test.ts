import { expect, it } from "vitest";
import { formatShiftDuration } from "./internship-operational-pdf";

it("exibe a duração prevista do serviço, inclusive ao atravessar a meia-noite", () => {
  expect(formatShiftDuration("2026-09-26T10:45:00Z", "2026-09-26T22:45:00Z")).toBe("12 h");
  expect(formatShiftDuration("2026-09-26T21:00:00Z", "2026-09-27T01:00:00Z")).toBe("4 h");
  expect(formatShiftDuration("2026-09-26T09:00:00Z", "2026-09-27T09:00:00Z")).toBe("24 h");
  expect(formatShiftDuration("2026-09-26T09:00:00Z", "2026-09-26T15:30:00Z")).toBe("6 h 30 min");
});
