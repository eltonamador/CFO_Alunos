import { describe, expect, it } from "vitest";
import { hoursFromTimes, instructionalDays, projectedWorkload } from "./instructionJournal";

describe("diário de instrução", () => {
  it("converte duração em hora-aula de cinquenta minutos", () => {
    expect(hoursFromTimes("08:00", "09:40")).toBe(2);
    expect(hoursFromTimes("08:00", "09:00")).toBe(1.2);
    expect(hoursFromTimes("09:00", "08:00")).toBeNull();
  });

  it("sinaliza déficit somente quando há planejamento suficiente para projetar", () => {
    expect(
      projectedWorkload({
        adoptedHours: 40,
        taughtHours: 20,
        scheduledFutureHours: 20,
        hasAcademicYear: true,
        hasMappedFuturePlan: true,
      }).status,
    ).toBe("on_track");
    expect(
      projectedWorkload({
        adoptedHours: 40,
        taughtHours: 20,
        scheduledFutureHours: 10,
        hasAcademicYear: true,
        hasMappedFuturePlan: true,
      }).deficitHours,
    ).toBe(10);
    expect(
      projectedWorkload({
        adoptedHours: 40,
        taughtHours: 20,
        scheduledFutureHours: 0,
        hasAcademicYear: true,
        hasMappedFuturePlan: false,
      }).status,
    ).toBe("insufficient_data");
  });

  it("conta dias úteis não bloqueados para a cadência", () => {
    expect(
      instructionalDays({
        startsOn: "2026-09-14",
        endsOn: "2026-09-18",
        blockedDates: ["2026-09-16"],
        asOf: "2026-09-16",
      }),
    ).toEqual({ total: 4, elapsed: 2, remaining: 2 });
  });
});
