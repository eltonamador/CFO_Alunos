import { describe, expect, it } from "vitest";
import {
  rankRotationCandidates,
  serviceOverlapsBirthday,
  type RotationAssignment,
  type RotationCommitment,
} from "./rotation";

const cadets = [
  { id: "a", war_name: "A", student_number: 1 },
  { id: "b", war_name: "B", student_number: 2 },
];
const base = {
  cadets,
  assignments: [] as RotationAssignment[],
  commitments: [] as RotationCommitment[],
  startsAt: "2026-10-10T10:00:00-03:00",
  endsAt: "2026-10-10T18:00:00-03:00",
  timezone: "America/Belem",
  blocked: {},
};
const assignment = (
  studentId: string,
  plannedMinutes: number,
  extra: Partial<RotationAssignment> = {},
): RotationAssignment => ({
  studentId,
  startsAt: "2026-10-01T10:00:00-03:00",
  endsAt: "2026-10-01T18:00:00-03:00",
  plannedMinutes,
  approvedMinutes: null,
  active: true,
  ...extra,
});
const commitment = (studentId: string, startsAt: string, endsAt: string): RotationCommitment => ({
  studentId,
  startsAt,
  endsAt,
});

describe("rodízio do estágio", () => {
  it("reserva o aniversário, inclusive quando o plantão noturno começa na véspera", () => {
    expect(serviceOverlapsBirthday(
      "09-27", "2026-09-26T19:45:00-03:00", "2026-09-27T07:45:00-03:00", "America/Belem",
    )).toBe(true);
    expect(serviceOverlapsBirthday(
      "09-27", "2026-09-28T18:00:00-03:00", "2026-09-29T06:00:00-03:00", "America/Belem",
    )).toBe(false);
    const result = rankRotationCandidates({
      ...base,
      cadets: [
        { ...cadets[0]!, birthMonthDay: "10-10" },
        { ...cadets[1]!, birthMonthDay: "09-27" },
      ],
      startsAt: "2026-09-27T10:00:00-03:00",
      endsAt: "2026-09-27T18:00:00-03:00",
    });
    expect(result[0]!.id).toBe("a");
    expect(result[1]!.reasons).toContain("Serviço no dia do aniversário");
  });
  it("prioriza horas e inclui compromissos futuros de 8, 12 e 24 horas", () => {
    const result = rankRotationCandidates({
      ...base,
      assignments: [
        assignment("a", 1440, { startsAt: "2026-11-01T06:00:00-03:00" }),
        assignment("b", 480),
        assignment("b", 720),
      ],
    });
    expect(result.map((row) => row.id)).toEqual(["b", "a"]);
    expect(result[0]!.projectedMinutes).toBe(1680);
  });
  it("usa a homologação vigente uma única vez e preserva homologação zero", () => {
    const [a] = rankRotationCandidates({
      ...base,
      cadets: [cadets[0]!],
      assignments: [
        assignment("a", 1440, { approvedMinutes: 120 }),
        assignment("a", 720, { approvedMinutes: 0 }),
        assignment("a", 480),
      ],
    });
    expect(a).toMatchObject({ approvedMinutes: 120, reservedMinutes: 480, committedMinutes: 600 });
  });
  it("libera reserva de cancelados ou substituídos, mantendo eventual carga homologada", () => {
    const [a] = rankRotationCandidates({
      ...base,
      cadets: [cadets[0]!],
      assignments: [
        assignment("a", 1440, { active: false }),
        assignment("a", 480, { active: false, approvedMinutes: 60 }),
      ],
    });
    expect(a!.committedMinutes).toBe(60);
  });
  it("coloca impedidos depois dos elegíveis mesmo com menos carga", () => {
    const result = rankRotationCandidates({
      ...base,
      assignments: [assignment("b", 1440)],
      blocked: { a: ["Conflito com ABM"] },
    });
    expect(result.map((row) => row.id)).toEqual(["b", "a"]);
    expect(result[1]!.reasons).toContain("Conflito com ABM");
  });
  it("bloqueia sobreposição e descanso inferior a 24 horas antes e depois", () => {
    for (const [from, to, reason] of [
      ["2026-10-10T17:00:00-03:00", "2026-10-11T05:00:00-03:00", "Serviço no mesmo horário"],
      ["2026-10-09T18:00:00-03:00", "2026-10-09T19:00:00-03:00", "Descanso anterior inferior a 24 horas"],
      ["2026-10-11T17:00:00-03:00", "2026-10-11T18:00:00-03:00", "Descanso posterior inferior a 24 horas"],
    ] as const) {
      const result = rankRotationCandidates({ ...base, commitments: [commitment("a", from, to)] });
      expect(result.find((row) => row.id === "a")?.reasons).toContain(reason);
    }
  });
  it("bloqueia segundo serviço no mesmo dia quando faltam 24 horas", () => {
    const result = rankRotationCandidates({
      ...base,
      commitments: [commitment("a", "2026-10-10T06:00:00-03:00", "2026-10-10T09:00:00-03:00")],
    });
    expect(result.find((row) => row.id === "a")?.reasons).toContain("Descanso anterior inferior a 24 horas");
  });
  it("aceita intervalo de 24 horas exatas mesmo em dias consecutivos", () => {
    const result = rankRotationCandidates({
      ...base,
      commitments: [commitment("a", "2026-10-08T18:00:00-03:00", "2026-10-09T10:00:00-03:00")],
    });
    expect(result.find((row) => row.id === "a")?.reasons).toEqual([]);
  });
  it("em igualdade de carga sugere quem fez menos plantões do tipo e no GBM", () => {
    const result = rankRotationCandidates({
      ...base,
      targetActivityCode: "usb",
      targetSiteName: "2º GBM",
      assignments: [
        assignment("a", 720, { activityCode: "usb", siteName: "1º GBM" }),
        assignment("b", 720, { activityCode: "ar", siteName: "2º GBM" }),
      ],
    });
    expect(result.map((row) => row.id)).toEqual(["b", "a"]);
    expect(result.find((row) => row.id === "a")).toMatchObject({
      sameActivityShifts: 1,
      sameSiteShifts: 0,
    });
  });
  it("entre cadetes com igual carga e tipo sugere quem ainda não passou pelo GBM", () => {
    const result = rankRotationCandidates({
      ...base,
      targetActivityCode: "usb",
      targetSiteName: "2º GBM",
      assignments: [
        assignment("a", 720, { activityCode: "usb", siteName: "2º GBM" }),
        assignment("b", 720, { activityCode: "usb", siteName: "1º GBM" }),
      ],
    });
    expect(result.map((row) => row.id)).toEqual(["b", "a"]);
  });
  it("não conta plantão homologado com zero hora como passagem pelo tipo e local", () => {
    const [candidate] = rankRotationCandidates({
      ...base,
      cadets: [cadets[0]!],
      targetActivityCode: "usb",
      targetSiteName: "2º GBM",
      assignments: [assignment("a", 720, {
        activityCode: "usb", siteName: "2º GBM", approvedMinutes: 0,
      })],
    });
    expect(candidate).toMatchObject({ sameActivityShifts: 0, sameSiteShifts: 0 });
  });
  it("usa datas de Belém e fim exclusivo em meia-noite", () => {
    const result = rankRotationCandidates({
      ...base,
      commitments: [commitment("a", "2026-10-08T18:00:00-03:00", "2026-10-09T00:00:00-03:00")],
    });
    expect(result.find((row) => row.id === "a")?.reasons).toEqual([]);
  });
  it("desempata pelo menor intervalo entre anterior e próximo plantão", () => {
    const result = rankRotationCandidates({
      ...base,
      commitments: [
        commitment("a", "2026-10-07T10:00:00-03:00", "2026-10-07T18:00:00-03:00"),
        commitment("a", "2026-10-12T06:00:00-03:00", "2026-10-12T18:00:00-03:00"),
        commitment("b", "2026-10-06T10:00:00-03:00", "2026-10-06T18:00:00-03:00"),
      ],
    });
    expect(result.map((row) => row.id)).toEqual(["b", "a"]);
    expect(result[1]!.restAfterMinutes).toBe(36 * 60);
    expect(result[1]!.restBeforeMinutes).toBe(64 * 60);
  });
  it("retorna ordem estável sem histórico e rotaciona após reservar o primeiro", () => {
    expect(rankRotationCandidates(base).map((row) => row.id)).toEqual(["a", "b"]);
    expect(
      rankRotationCandidates({ ...base, assignments: [assignment("a", 480)] }).map((row) => row.id),
    ).toEqual(["b", "a"]);
  });
  it("não confunde duração do novo turno de 24h com turno de 8h", () => {
    const result = rankRotationCandidates({ ...base, endsAt: "2026-10-11T10:00:00-03:00" });
    expect(result[0]!.projectedMinutes).toBe(1440);
  });
});
