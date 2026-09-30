import { z } from "zod";
import { addDays, calendarDay } from "./rotation";
import type { PermanenceRow } from "./permanence";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const date = new Date(`${v}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v;
  });
export const cancellationPeriodSchema = z
  .object({
    programId: z.string().uuid(),
    start: day,
    end: day,
  })
  .refine(
    (v) =>
      day.safeParse(v.start).success &&
      day.safeParse(v.end).success &&
      v.start <= v.end &&
      v.end <= addDays(v.start, 30),
    "Selecione um período de até 31 dias, em ordem.",
  );
export const cancellationBatchSchema = z.object({
  programId: z.string().uuid(),
  rosterIds: z.array(z.string().uuid()).min(1).max(62),
  assignmentIds: z.array(z.string().uuid()).min(1).max(248),
  reason: z.string().trim().min(5).max(1000),
});
export type CancellationBatch = z.infer<typeof cancellationBatchSchema>;
export type CancellationPreview = {
  rows: PermanenceRow[];
  rosterIds: string[];
  assignmentIds: string[];
  cadetCount: number;
};
export function previewCancellation(
  rows: PermanenceRow[],
  start: string,
  end: string,
  now: number,
): CancellationPreview {
  const selected = rows.filter(
    (r) =>
      r.editable &&
      r.startsAt &&
      Date.parse(r.startsAt) > now &&
      ["prevista", "confirmada"].includes(r.status) &&
      calendarDay(Date.parse(r.startsAt), "America/Belem") >= start &&
      calendarDay(Date.parse(r.startsAt), "America/Belem") <= end,
  );
  selected.sort((a, b) => a.startsAt!.localeCompare(b.startsAt!) || a.role.localeCompare(b.role));
  return {
    rows: selected,
    rosterIds: [...new Set(selected.map((r) => r.rosterId))],
    assignmentIds: selected.map((r) => r.id),
    cadetCount: new Set(selected.map((r) => r.studentId)).size,
  };
}
export function nextWeekend(today: string) {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const start = weekday === 0 ? today : addDays(today, (6 - weekday + 7) % 7);
  return { start, end: weekday === 0 ? today : addDays(start, 1) };
}
