import { z } from "zod";
import { minutesBetween } from "./workload";

export const handoverSchema = z.object({
  assignmentId: z.string().uuid(),
  newStudentId: z.string().uuid(),
  handoverAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(5).max(500),
});

/** Single, minute-precision handover: no uncovered interval or double counting. */
export function handoverMinutes(startsAt: string, endsAt: string, handoverAt: string) {
  return {
    outgoing: minutesBetween(startsAt, handoverAt),
    incoming: minutesBetween(handoverAt, endsAt),
  };
}
