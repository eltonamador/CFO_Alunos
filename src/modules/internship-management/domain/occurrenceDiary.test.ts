import { describe, expect, it } from "vitest";
import {
  diaryBadges,
  diaryBoard,
  diaryStats,
  monthHighlights,
  monthStart,
  occurrenceTypeLabel,
  prepareDiaryEntry,
  shiftLabel,
  shiftVehicle,
  suggestedShift,
  summarizeReactions,
  type DiaryShift,
} from "./occurrenceDiary";

const shift = (id: string, startsAt: string, activity = "usb"): DiaryShift => ({
  assignment_id: id,
  activity_code: activity,
  activity_name: activity === "usb" ? "USB—APH" : "Guarda-vida",
  site_name: "1º GBM",
  starts_at: startsAt,
  ends_at: startsAt,
});

describe("preparo do registro", () => {
  it("exige só a frase do que aconteceu, e apenas fora do rascunho", () => {
    expect(prepareDiaryEntry({ intent: "rascunho" })).toMatchObject({
      ok: true,
      row: { status: "rascunho", summary: "", occurrence_type: null, companion_ids: [] },
    });
    expect(prepareDiaryEntry({ intent: "compartilhado", summary: "  " })).toEqual({
      ok: false,
      error: "Conte em uma frase o que aconteceu.",
    });
    expect(prepareDiaryEntry({ intent: "pessoal", summary: "Queda de moto" })).toMatchObject({
      ok: true,
      row: { status: "pessoal", summary: "Queda de moto" },
    });
  });

  it("não bloqueia por detalhes: ignora opções desconhecidas e corta excessos", () => {
    const result = prepareDiaryEntry({
      intent: "pessoal",
      summary: "x".repeat(250),
      severity: "gravissima",
      occurrenceType: "aph",
      otherType: "não usado",
      occurredOn: "26/09/2026",
      assignmentId: "sem-plantao",
      companionIds: ["a", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      perception: "",
    });
    expect(result).toMatchObject({
      ok: true,
      row: {
        severity: null,
        occurrence_type: "aph",
        other_type: null,
        assignment_id: null,
        perception: null,
        companion_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      },
    });
    if (!result.ok) return;
    expect(result.row.summary).toHaveLength(200);
    expect(result.row).not.toHaveProperty("occurred_on");
  });

  it("mantém o tipo livre quando a opção é outro", () => {
    const result = prepareDiaryEntry({
      intent: "rascunho",
      occurrenceType: "outro",
      otherType: " Resgate em elevador ",
      occurredOn: "2026-09-26",
    });
    expect(result).toMatchObject({
      ok: true,
      row: { occurrence_type: "outro", other_type: "Resgate em elevador", occurred_on: "2026-09-26" },
    });
    expect(occurrenceTypeLabel("outro", "Resgate em elevador")).toBe("Resgate em elevador");
    expect(occurrenceTypeLabel("aph")).toBe("APH (atendimento pré-hospitalar)");
  });
});

describe("plantão sugerido", () => {
  const now = Date.parse("2026-09-27T10:00:00-03:00");
  it("sugere o último plantão iniciado na última semana", () => {
    const shifts = [
      shift("antigo", "2026-09-19T07:45:00-03:00"),
      shift("ontem", "2026-09-26T19:45:00-03:00"),
      shift("futuro", "2026-09-28T07:45:00-03:00"),
    ];
    expect(suggestedShift(shifts, now)?.assignment_id).toBe("ontem");
    expect(suggestedShift([shifts[0]!], now)).toBeNull();
    expect(shiftLabel(shifts[1]!)).toBe("26/09 19:45 · USB—APH · 1º GBM");
  });

  it("sugere a viatura pela vaga e deixa em branco na praia", () => {
    expect(shiftVehicle(shift("a", "2026-09-26T07:45:00-03:00"))).toBe("USB");
    expect(shiftVehicle(shift("b", "2026-09-26T07:45:00-03:00", "guarda_vida"))).toBe("");
  });
});

describe("incentivo simbólico", () => {
  const entries = [
    { id: "1", status: "compartilhado" as const, occurrence_type: "aph" },
    { id: "2", status: "pessoal" as const, occurrence_type: "salvamento_aquatico" },
    { id: "3", status: "rascunho" as const, occurrence_type: "incendio_urbano" },
  ];

  it("conta registros salvos e tipos vividos, sem rascunhos", () => {
    expect(diaryStats(entries)).toEqual({ saved: 2, drafts: 1, shared: 1, types: 2 });
  });

  it("concede insígnias por marcos, não por pontos", () => {
    const earned = (totals?: Map<string, number>) =>
      diaryBadges(entries, totals)
        .filter((badge) => badge.earned)
        .map((badge) => badge.code);
    expect(earned()).toEqual(["primeiro_registro", "primeiro_aph", "primeiro_salvamento_aquatico"]);
    expect(earned(new Map([["1", 5]]))).toContain("relato_inspirador");
    expect(diaryBadges(entries).find((badge) => badge.code === "cinco_tipos")?.hint).toBe(
      "2 de 5 tipos vividos.",
    );
  });

  it("resume reações por relato e marca as do próprio usuário", () => {
    const summary = summarizeReactions(
      [
        { entry_id: "1", user_id: "eu", kind: "aplauso" },
        { entry_id: "1", user_id: "outro", kind: "aplauso" },
        { entry_id: "1", user_id: "outro", kind: "aprendi" },
        { entry_id: "1", user_id: "outro", kind: "desconhecida" },
      ],
      "eu",
    ).get("1");
    expect(summary).toEqual({ counts: { aplauso: 2, aprendi: 1 }, mine: ["aplauso"], total: 3 });
  });
});

describe("quadro da turma", () => {
  const shared = [
    { id: "a1", student_id: "ana", occurrence_type: "aph" },
    { id: "a2", student_id: "ana", occurrence_type: "aph" },
    { id: "b1", student_id: "bia", occurrence_type: "aph" },
    { id: "b2", student_id: "bia", occurrence_type: "incendio_urbano" },
    { id: "c1", student_id: "caio", occurrence_type: null },
  ];
  const totals = new Map([
    ["a1", 1],
    ["b2", 4],
    ["c1", 4],
  ]);
  const names: Record<string, string> = { ana: "ANA", bia: "BIA", caio: "CAIO" };

  it("ordena pelo critério escolhido e empates dividem a medalha", () => {
    const byShared = diaryBoard(shared, totals, "registros", (id) => names[id]!);
    expect(byShared.map((row) => [row.studentId, row.shared, row.medal])).toEqual([
      ["bia", 2, 1],
      ["ana", 2, 1],
      ["caio", 1, 2],
    ]);
    const byVariety = diaryBoard(shared, totals, "variedade");
    expect(byVariety.map((row) => [row.studentId, row.types, row.medal])).toEqual([
      ["bia", 2, 1],
      ["ana", 1, 2],
      ["caio", 0, null],
    ]);
    expect(diaryBoard(shared, totals, "reacoes").map((row) => row.reactions)).toEqual([4, 4, 1]);
  });

  it("não lista quem não compartilhou", () => {
    expect(diaryBoard([], totals, "registros")).toEqual([]);
  });

  it("destaca o que a Coordenação escolheu e o mais apreciado do mês", () => {
    const now = Date.parse("2026-10-15T10:00:00-03:00");
    expect(monthStart(now)).toBe("2026-10-01T00:00:00-03:00");
    const entries = [
      { id: "old", featured_at: "2026-09-30T12:00:00-03:00", shared_at: "2026-09-29T12:00:00-03:00" },
      { id: "new", featured_at: "2026-10-02T12:00:00-03:00", shared_at: "2026-10-01T12:00:00-03:00" },
      { id: "liked", featured_at: null, shared_at: "2026-10-03T12:00:00-03:00" },
      { id: "quiet", featured_at: null, shared_at: "2026-10-04T12:00:00-03:00" },
    ];
    const highlights = monthHighlights(
      entries,
      new Map([
        ["liked", 3],
        ["old", 9],
      ]),
      monthStart(now),
    );
    expect(highlights.featured.map((entry) => entry.id)).toEqual(["new"]);
    expect(highlights.appreciated.map((entry) => entry.id)).toEqual(["liked"]);
  });
});
