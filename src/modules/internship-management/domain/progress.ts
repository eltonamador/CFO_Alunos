const DAY_MS = 24 * 60 * 60 * 1000;

function belemMidnight(value: string): number {
  return Date.parse(`${value}T00:00:00-03:00`);
}

export function internshipProgress(input: {
  startsOn: string;
  endsOn: string;
  validatedMinutes: number;
  requiredMinutes: number;
  shiftEnds: readonly string[];
  now: Date;
}) {
  const start = belemMidnight(input.startsOn);
  const endExclusive = belemMidnight(input.endsOn) + DAY_MS;
  const duration = Math.max(DAY_MS, endExclusive - start);
  const elapsed = Math.min(duration, Math.max(0, input.now.getTime() - start));
  const totalDays = duration / DAY_MS;
  const elapsedDays = Math.floor(elapsed / DAY_MS);
  const required = Math.max(1, input.requiredMinutes);
  const validated = Math.max(0, input.validatedMinutes);
  const endedShifts = input.shiftEnds.filter((value) => Date.parse(value) <= input.now.getTime()).length;
  const totalShifts = input.shiftEnds.length;

  return {
    elapsedDays,
    totalDays,
    periodPercent: elapsed === duration ? 100 : Math.min(99, Math.round((elapsed / duration) * 100)),
    hoursPercent: Math.round((validated / required) * 100),
    hoursBarPercent: Math.min(100, (validated / required) * 100),
    missingMinutes: Math.max(0, required - validated),
    endedShifts,
    totalShifts,
    shiftsPercent: totalShifts ? Math.round((endedShifts / totalShifts) * 100) : 0,
  };
}
