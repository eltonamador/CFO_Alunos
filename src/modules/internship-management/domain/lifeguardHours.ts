import { z } from "zod";
export const lifeguardHoursSchema = z
  .object({
    programId: z.string().uuid(),
    date: z.string().date(),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    expectedStart: z.string().datetime({ offset: true }),
    expectedEnd: z.string().datetime({ offset: true }),
    assignmentIds: z.array(z.string().uuid()).length(5),
    reason: z.string().trim().min(5).max(1000),
  })
  .superRefine((v, c) => {
    const duration = (Date.parse(v.endsAt) - Date.parse(v.startsAt)) / 60000;
    const localDay = (s: string) =>
      new Date(Date.parse(s) - 3 * 3600000).toISOString().slice(0, 10);
    if (
      duration < 60 ||
      duration > 480 ||
      localDay(v.startsAt) !== v.date ||
      localDay(v.endsAt) !== v.date
    )
      c.addIssue({ code: "custom", message: "Informe de 1 a 8 horas no mesmo dia de praia." });
    if (new Set(v.assignmentIds).size !== 5)
      c.addIssue({ code: "custom", message: "Confira os cinco postos da escala." });
  });
export type LifeguardHoursInput = z.input<typeof lifeguardHoursSchema>;
export type LifeguardDay = {
  date: string;
  startsAt: string;
  endsAt: string;
  assignmentIds: string[];
  cadets: string[];
  uniforms: string[];
};
