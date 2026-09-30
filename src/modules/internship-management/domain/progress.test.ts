import { describe, expect, it } from "vitest";
import { internshipProgress } from "./progress";

const base = {
  startsOn: "2026-09-26",
  endsOn: "2026-09-30",
  validatedMinutes: 720,
  requiredMinutes: 1500,
  shiftEnds: ["2026-09-28T09:00:00Z", "2026-09-29T21:00:00Z"],
};

describe("progresso do estágio", () => {
  it("usa o período completo em Belém e conta apenas plantões já encerrados", () => {
    const progress = internshipProgress({
      ...base,
      now: new Date("2026-09-29T18:00:00Z"),
    });
    expect(progress).toMatchObject({
      elapsedDays: 3,
      totalDays: 5,
      periodPercent: 73,
      hoursPercent: 48,
      missingMinutes: 780,
      endedShifts: 1,
      totalShifts: 2,
      shiftsPercent: 50,
    });
  });

  it("limita as barras antes e depois do programa sem perder horas excedentes", () => {
    expect(internshipProgress({ ...base, now: new Date("2026-09-25T12:00:00Z") }).periodPercent).toBe(0);
    expect(internshipProgress({ ...base, now: new Date("2026-09-30T15:00:00Z") }).periodPercent).toBeLessThan(100);
    const finished = internshipProgress({
      ...base,
      validatedMinutes: 1800,
      shiftEnds: [],
      now: new Date("2026-10-02T12:00:00Z"),
    });
    expect(finished).toMatchObject({
      periodPercent: 100,
      hoursPercent: 120,
      hoursBarPercent: 100,
      missingMinutes: 0,
      shiftsPercent: 0,
    });
  });
});
