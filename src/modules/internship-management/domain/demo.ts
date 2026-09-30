import { z } from "zod";
import { evaluationBodySchema, type EvaluationBody } from "./evaluationValidation";
import { completion, minutesBetween, sumWorkload, validateApproval } from "./workload";

const iso = z.string().datetime({ offset: true });
const shiftSchema = z.object({
  id: z.enum(["passado", "presente", "futuro"]),
  service: z.string(),
  site: z.string(),
  startsAt: iso,
  endsAt: iso,
  entry: iso.optional(),
  exit: iso.optional(),
  evaluation: z.object({ body: evaluationBodySchema, released: z.boolean() }).optional(),
  execution: z
    .object({
      performed: z.number().int().nonnegative(),
      approved: z.number().int().nonnegative(),
      reason: z.string(),
    })
    .optional(),
});
export const demoSchema = z.object({
  version: z.literal(1),
  clock: iso,
  shifts: z.array(shiftSchema).length(3),
});
export type DemoSession = z.infer<typeof demoSchema>;
export type DemoShift = DemoSession["shifts"][number];
export function createDemo(now: string): DemoSession {
  const instant = Math.floor(Date.parse(now) / 60_000) * 60_000;
  const day = new Date(instant - 3 * 3600_000).toISOString().slice(0, 10);
  let today = Date.parse(`${day}T07:45:00-03:00`);
  if (today > instant) today -= 86400_000;
  const shift = (
    id: DemoShift["id"],
    start: number,
    hours: number,
    service: string,
  ): DemoShift => ({
    id,
    service,
    site: "GBM fictício · demonstração",
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + hours * 3600_000).toISOString(),
  });
  return {
    version: 1,
    clock: new Date(instant).toISOString(),
    shifts: [
      shift("passado", today - 3 * 86400_000, 12, "USB — APH"),
      shift("presente", today, 24, "AR — Salvamento"),
      shift("futuro", today + 7 * 86400_000, 12, "USB — APH"),
    ],
  };
}
export function demoPhase(shift: DemoShift, clock: string) {
  if (Date.parse(clock) < Date.parse(shift.startsAt)) return "Agendado";
  if (Date.parse(clock) < Date.parse(shift.endsAt)) return "Em andamento";
  return "Encerrado";
}
export function demoTotals(session: DemoSession) {
  const workload = sumWorkload(
    session.shifts.map((s) => ({
      plannedMinutes: minutesBetween(s.startsAt, s.endsAt),
      performedMinutes: s.execution?.performed ?? 0,
      validatedMinutes: s.execution?.approved ?? 0,
    })),
  );
  return { ...workload, ...completion(workload.validatedMinutes, 15000, 15120) };
}
export type DemoAction =
  | { type: "advance"; id: DemoShift["id"]; to: "start" | "end" }
  | { type: "point"; id: DemoShift["id"]; kind: "entry" | "exit" }
  | { type: "evaluate"; id: DemoShift["id"]; body: EvaluationBody }
  | { type: "release"; id: DemoShift["id"] }
  | { type: "homologate"; id: DemoShift["id"]; approved: number; reason: string };
export function applyDemo(session: DemoSession, action: DemoAction): DemoSession {
  const current = session.shifts.find((s) => s.id === action.id);
  if (!current) throw Error("Plantão de teste indisponível.");
  if (action.type === "advance") {
    const clock = action.to === "start" ? current.startsAt : current.endsAt;
    return {
      ...session,
      clock: new Date(Math.max(Date.parse(session.clock), Date.parse(clock))).toISOString(),
    };
  }
  const shift = { ...current };
  const ended = demoPhase(shift, session.clock) === "Encerrado";
  if (action.type === "point") {
    if (action.kind === "entry") {
      if (demoPhase(shift, session.clock) !== "Em andamento" || shift.entry)
        throw Error("Simule a entrada durante o plantão, uma única vez.");
      shift.entry = session.clock;
    } else {
      if (!shift.entry || shift.exit || Date.parse(session.clock) <= Date.parse(shift.entry))
        throw Error("Registre entrada e avance o relógio antes da saída.");
      shift.exit = session.clock;
    }
  }
  if (action.type === "evaluate") {
    if (!ended) throw Error("Aguarde o fim do plantão no relógio do teste.");
    if (shift.evaluation) throw Error("Esta avaliação já foi enviada.");
    shift.evaluation = { body: evaluationBodySchema.parse(action.body), released: false };
  }
  if (action.type === "release") {
    if (!shift.evaluation) throw Error("Envie a avaliação antes de revisar.");
    shift.evaluation = { ...shift.evaluation, released: true };
  }
  if (action.type === "homologate") {
    if (!ended) throw Error("A homologação fica disponível após o fim do plantão.");
    if (shift.execution) throw Error("Esta jornada já foi homologada no teste.");
    const performed = validateApproval({
      actualStartsAt: shift.startsAt,
      actualEndsAt: shift.endsAt,
      approvedMinutes: action.approved,
      supervisorName: "Oficial fictício",
      paperReference: "Ficha de demonstração",
      decisionReason: action.reason,
    });
    shift.execution = { performed, approved: action.approved, reason: action.reason.trim() };
  }
  return { ...session, shifts: session.shifts.map((s) => (s.id === shift.id ? shift : s)) };
}
