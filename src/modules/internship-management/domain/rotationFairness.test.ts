import { describe, expect, it } from "vitest";
import { minimumRestLoad, rotationCalendarLoad, type ServiceInterval } from "./rotationFairness";
import { rankRotationCandidates } from "./rotation";

const service = (start: string, hours = 12): ServiceInterval => ({
  startsAt: start,
  endsAt: new Date(Date.parse(start) + hours * 3_600_000).toISOString(),
});
const chain = Array.from({ length: 5 }, (_, i) =>
  service(new Date(Date.parse("2026-10-05T06:00:00-03:00") + i * 36 * 3_600_000).toISOString()),
);
const timezone = "America/Belem";
const target = service("2026-10-10T10:00:00-03:00", 8);
const cadets = ["a", "b"].map((id, i) => ({ id, war_name: id, student_number: i + 1 }));

describe("descanso e fins de semana no rodízio", () => {
  it("prefere 72h a 24h mesmo com carga maior e mais experiência no serviço", () => {
    const assignments = [
      { studentId: "a", ...service("2026-10-08T22:00:00-03:00"), activityCode: "ar" },
      { studentId: "b", ...service("2026-10-06T10:00:00-03:00", 24), activityCode: "usb" },
    ].map((x) => ({
      ...x,
      plannedMinutes: (Date.parse(x.endsAt) - Date.parse(x.startsAt)) / 60000,
      active: true,
      approvedMinutes: null,
    }));
    const result = rankRotationCandidates({
      cadets,
      assignments,
      commitments: assignments,
      ...target,
      timezone,
      blocked: {},
      targetActivityCode: "usb",
    });
    expect(result.map((x) => x.id)).toEqual(["b", "a"]);
    expect(result[0]!.restBeforeMinutes).toBe(72 * 60);
  });
  it("com recuperação suficiente preserva quem trabalhou no fim de semana anterior", () => {
    const assignments = [
      { studentId: "a", ...service("2026-10-03T06:00:00-03:00") },
      { studentId: "b", ...service("2026-10-05T06:00:00-03:00") },
    ].map((x) => ({ ...x, plannedMinutes: 720, active: true, approvedMinutes: null }));
    const result = rankRotationCandidates({
      cadets,
      assignments,
      commitments: assignments,
      ...target,
      timezone,
      blocked: {},
    });
    expect(result.map((x) => x.id)).toEqual(["b", "a"]);
    expect(result[1]).toMatchObject({ weekendCount: 1, projectedWeekendStreak: 2 });
  });
  it("conta sábado e domingo como um fim de semana e evita duplicar fontes", () => {
    const first = service("2026-10-03T06:00:00-03:00");
    const stats = rotationCalendarLoad(
      [first, first, service("2026-10-04T18:00:00-03:00")],
      target,
      timezone,
    );
    expect(stats).toMatchObject({
      weekendCount: 1,
      weekendMinutes: 18 * 60,
      weekdayMinutes: 6 * 60,
      projectedWeekendCount: 2,
      projectedWeekendStreak: 2,
    });
  });
  it("divide sexta à noite e domingo à noite por meia-noite de Belém", () => {
    const stats = rotationCalendarLoad(
      [service("2026-10-02T18:00:00-03:00"), service("2026-10-04T18:00:00-03:00")],
      target,
      timezone,
    );
    expect(stats).toMatchObject({
      weekendCount: 1,
      weekendMinutes: 12 * 60,
      weekdayMinutes: 12 * 60,
    });
  });
  it("fim exclusivo à meia-noite de sábado não compromete fim de semana", () => {
    expect(
      rotationCalendarLoad([], service("2026-10-02T12:00:00-03:00"), timezone).isWeekendService,
    ).toBe(false);
  });
  it("considera permanência no rodízio do fim de semana", () => {
    const result = rankRotationCandidates({
      cadets,
      assignments: [],
      commitments: [],
      ...target,
      timezone,
      blocked: {},
      duties: [{ studentId: "a", date: "2026-10-03", ...service("2026-10-03T06:00:00-03:00") }],
    });
    expect(result.map((x) => x.id)).toEqual(["b", "a"]);
    expect(result[1]!.weekendMinutes).toBe(720);
  });
});

describe("limite de três intervalos de 24h em 28 dias", () => {
  it("permite a terceira ocorrência e recusa a quarta", () => {
    expect(minimumRestLoad(chain.slice(0, 3), chain[3]!)).toMatchObject({
      projectedMinimumRestMaximum: 3,
      minimumRestLimitExceeded: false,
    });
    expect(minimumRestLoad(chain.slice(0, 4), chain[4]!)).toMatchObject({
      projectedMinimumRestMaximum: 4,
      minimumRestLimitExceeded: true,
    });
  });
  it("inserção no meio conta os intervalos anterior e posterior", () => {
    expect(minimumRestLoad([chain[0]!, chain[1]!, chain[2]!, chain[4]!], chain[3]!)).toMatchObject({
      projectedMinimumRestMaximum: 4,
      minimumRestLimitExceeded: true,
    });
  });
  it("une períodos contíguos e fontes duplicadas sem inventar descanso", () => {
    expect(
      minimumRestLoad([chain[0]!, chain[0]!, service(chain[0]!.endsAt)], chain[1]!)
        .minimumRestOccurrences,
    ).toBe(0);
  });
  it("não trata 24h01 como 24h exatas nem converte sobreposição em folga", () => {
    const a = service("2026-10-01T06:00:00-03:00");
    expect(
      minimumRestLoad([a], service("2026-10-02T18:01:00-03:00")).projectedMinimumRestMaximum,
    ).toBe(0);
    expect(
      minimumRestLoad([a], service("2026-10-01T10:00:00-03:00")).projectedMinimumRestMaximum,
    ).toBe(0);
  });
  it("a janela expira e não bloqueia escolhas sem relação com infração antiga", () => {
    expect(
      minimumRestLoad(chain, service("2026-11-12T06:00:00-03:00")).minimumRestLimitExceeded,
    ).toBe(false);
  });
  it("eventos exatamente 28 dias separados não ocupam a mesma janela", () => {
    const eventDays = ["2026-10-01", "2026-10-10", "2026-10-20", "2026-10-29"];
    const pairs = eventDays.flatMap((day) => {
      const event = Date.parse(`${day}T18:00:00-03:00`);
      return [
        service(new Date(event - 36 * 3_600_000).toISOString()),
        service(new Date(event).toISOString()),
      ];
    });
    expect(minimumRestLoad(pairs.slice(0, -1), pairs.at(-1)!)).toMatchObject({
      projectedMinimumRestMaximum: 3,
      minimumRestLimitExceeded: false,
    });
    const earlier = service(new Date(Date.parse(pairs.at(-1)!.startsAt) - 60000).toISOString());
    const previous = service(new Date(Date.parse(earlier.startsAt) - 36 * 3_600_000).toISOString());
    expect(
      minimumRestLoad([...pairs.slice(0, -2), previous], earlier).minimumRestLimitExceeded,
    ).toBe(true);
  });
  it("aplica o impedimento na lista e mantém os outros cadetes disponíveis", () => {
    const result = rankRotationCandidates({
      cadets,
      assignments: [],
      commitments: chain.slice(0, 4).map((s) => ({ ...s, studentId: "a" })),
      ...chain[4]!,
      timezone,
      blocked: {},
    });
    expect(result[0]!.id).toBe("b");
    expect(result[1]!.reasons).toContain(
      "Limite de três descansos de 24 horas em 28 dias excedido",
    );
  });
});
