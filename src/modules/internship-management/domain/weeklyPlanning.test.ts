import { describe, it, expect } from "vitest";
import { rotationRestAvailability } from "./rotation";
import {
  planWeekWithAlternatives,
  planWeek,
  type WeeklyContext,
  type WeeklySlot,
} from "./weeklyPlanning";
const cadets = Array.from({ length: 10 }, (_, n) => ({
  id: String(n + 1),
  student_number: n + 1,
  war_name: `Cadete ${n + 1}`,
}));
const slot = (id: string, date: string, minutes = 480): WeeklySlot => ({
  id,
  date,
  siteId: id,
  siteName: id,
  templateCode: "TEST",
  startsAt: `${date}T10:00:00-03:00`,
  endsAt: new Date(Date.parse(`${date}T10:00:00-03:00`) + minutes * 60000).toISOString(),
  blocked: {},
});
const context = (slots: WeeklySlot[]): WeeklyContext => ({
  cadets,
  slots,
  timezone: "America/Belem",
  assignments: [],
  commitments: [],
});
describe("montagem semanal", () => {
  it("preenche cinco postos simultâneos com pessoas distintas e reserva outros para domingo", () => {
    const ctx = context([
      ...Array.from({ length: 5 }, (_, n) => slot(`sab${n}`, "2026-10-10")),
      ...Array.from({ length: 5 }, (_, n) => slot(`dom${n}`, "2026-10-11")),
    ]);
    const result = planWeek(ctx);
    expect(new Set(result.map((r) => r.studentId)).size).toBe(10);
    expect(result.every((r) => !r.error)).toBe(true);
  });
  it("inclui as escolhas da própria semana na carga das próximas vagas", () => {
    const result = planWeek(context([slot("a", "2026-10-05", 1440), slot("b", "2026-10-09", 480)]));
    expect(result.map((r) => r.studentId)).toEqual(["1", "2"]);
    expect(result[1]!.candidates.find((c) => c.id === "1")?.committedMinutes).toBe(1440);
  });
  it("respeita escolha manual de plantão futuro durante a geração", () => {
    const result = planWeek(context([slot("a", "2026-10-10"), slot("b", "2026-10-11")]), {
      b: "1",
    });
    expect(result[0]!.studentId).toBe("2");
    expect(result[1]!.studentId).toBe("1");
    expect(result.every((r) => !r.error)).toBe(true);
  });
  it("sinaliza conflitos de alterações manuais sem trocar os demais cadetes", () => {
    const result = planWeek(context([slot("a", "2026-10-10"), slot("b", "2026-10-10")]), {
      a: "1",
      b: "1",
    });
    expect(result.every((r) => r.error?.includes("mesmo horário"))).toBe(true);
    expect(result.map((r) => r.studentId)).toEqual(["1", "1"]);
  });
  it("mantém vaga vazia quando faltam cadetes elegíveis", () => {
    const ctx = context([slot("a", "2026-10-10"), slot("b", "2026-10-10")]);
    ctx.cadets = cadets.slice(0, 1);
    expect(planWeek(ctx)[1]).toMatchObject({
      studentId: "",
      error: "Escolha um cadete disponível.",
    });
  });
  it("preserva remoção manual da seleção e não altera o contexto recebido", () => {
    const ctx = context([slot("a", "2026-10-10")]);
    const before = JSON.stringify(ctx);
    expect(planWeek(ctx, { a: "" })[0]!.studentId).toBe("");
    expect(JSON.stringify(ctx)).toBe(before);
  });
});

describe("busca de combinações alternativas", () => {
  const restrict = (item: WeeklySlot, allowed: string[]) => ({
    ...item,
    blocked: Object.fromEntries(
      cadets
        .filter((c) => !allowed.includes(c.id))
        .map((c) => [c.id, ["Indisponibilidade cadastrada"]]),
    ),
  });
  it("corrige a vaga vazia causada pela primeira escolha e preserva o contexto", () => {
    const ctx = context([slot("a", "2026-10-10"), restrict(slot("b", "2026-10-10"), ["1"])]);
    ctx.cadets = cadets.slice(0, 2);
    const before = JSON.stringify(ctx);
    const result = planWeekWithAlternatives(ctx);
    expect(result.choices.map((c) => c.studentId)).toEqual(["2", "1"]);
    expect(result).toMatchObject({ searchStatus: "complete", recoveredSlots: 1 });
    expect(result.choices.every((c) => !c.error)).toBe(true);
    expect(JSON.stringify(ctx)).toBe(before);
  });
  it("volta a escolhas anteriores quando a primeira alternativa também falha", () => {
    const ctx = context([
      restrict(slot("a", "2026-10-10"), ["1", "2"]),
      restrict(slot("b", "2026-10-10"), ["1", "3"]),
      restrict(slot("c", "2026-10-10"), ["1", "3"]),
      restrict(slot("d", "2026-10-10"), ["2", "4"]),
    ]);
    ctx.cadets = cadets.slice(0, 4);
    const result = planWeekWithAlternatives(ctx);
    expect(result.searchStatus).toBe("complete");
    expect(result.choices.every((c) => !c.error)).toBe(true);
    expect(new Set(result.choices.map((c) => c.studentId)).size).toBe(4);
    expect(result.choices[0]!.studentId).toBe("2");
    expect(result.choices[3]!.studentId).toBe("4");
  });
  it("não libera vaga à custa de mudar a escolha manual", () => {
    const ctx = context([slot("a", "2026-10-10"), restrict(slot("b", "2026-10-10"), ["1"])]);
    ctx.cadets = cadets.slice(0, 2);
    const overrides = { a: "1" };
    const result = planWeekWithAlternatives(ctx, overrides);
    expect(result.choices.map((c) => c.studentId)).toEqual(["1", ""]);
    expect(overrides).toEqual({ a: "1" });
    expect(result.searchStatus).toBe("exhausted");
  });
  it("preserva uma seleção esvaziada manualmente e ignora escolhas de plantões removidos", () => {
    const ctx = context([slot("a", "2026-10-10"), slot("b", "2026-10-10")]);
    expect(planWeek(ctx, { a: "", removido: "1" }).map((c) => c.studentId)).toEqual(["", "1"]);
  });
  it("não modifica combinação completa e mantém a ordem do rodízio", () => {
    const ctx = context([slot("a", "2026-10-10"), slot("b", "2026-10-10")]);
    const result = planWeekWithAlternatives(ctx);
    expect(result.searchStatus).toBe("not-needed");
    expect(result.choices.map((c) => c.studentId)).toEqual(["1", "2"]);
    expect(planWeekWithAlternatives(ctx)).toEqual(result);
  });
  it("mantém a melhor prévia e informa quando o limite de busca impede concluir", () => {
    const ctx = context([slot("a", "2026-10-10"), restrict(slot("b", "2026-10-10"), ["1"])]);
    ctx.cadets = cadets.slice(0, 2);
    const result = planWeekWithAlternatives(ctx, {}, { maxNodes: 0 });
    expect(result.searchStatus).toBe("limited");
    expect(result.choices.map((c) => c.studentId)).toEqual(["1", ""]);
    expect(result.recoveredSlots).toBe(0);
  });
  it("limita também verificações de disponibilidade, sem devolver escolhas parciais inválidas", () => {
    const ctx = context([slot("a", "2026-10-10"), restrict(slot("b", "2026-10-10"), ["1"])]);
    ctx.cadets = cadets.slice(0, 2);
    const result = planWeekWithAlternatives(ctx, {}, { maxChecks: 1 });
    expect(result.searchStatus).toBe("limited");
    expect(result.choices.filter((c) => c.studentId).every((c) => !c.error)).toBe(true);
  });
  it("preserva o mínimo de 24h ao procurar alternativas entre datas diferentes", () => {
    const ctx = context([
      slot("a", "2026-10-10", 720),
      restrict(slot("b", "2026-10-11", 720), ["1"]),
    ]);
    ctx.cadets = cadets.slice(0, 2);
    expect(planWeek(ctx).map((c) => c.studentId)).toEqual(["2", "1"]);
    ctx.commitments = [
      {
        studentId: "2",
        startsAt: "2026-10-09T10:00:00-03:00",
        endsAt: "2026-10-09T22:00:00-03:00",
      },
    ];
    const result = planWeek(ctx);
    expect(result.filter((c) => c.studentId)).toHaveLength(1);
    expect(result.filter((c) => c.studentId).every((c) => !c.error)).toBe(true);
  });
  it("não contorna a quarta folga mínima em 28 dias para completar uma vaga", () => {
    const first = Date.parse("2026-10-05T06:00:00-03:00");
    const ctx = context([
      slot("a", "2026-10-11", 720),
      restrict(slot("b", "2026-10-11", 720), ["1"]),
    ]);
    ctx.cadets = cadets.slice(0, 2);
    ctx.slots = ctx.slots.map((s) => ({
      ...s,
      startsAt: "2026-10-11T06:00:00-03:00",
      endsAt: "2026-10-11T18:00:00-03:00",
    }));
    ctx.commitments = Array.from({ length: 4 }, (_, i) => ({
      studentId: "1",
      startsAt: new Date(first + i * 36 * 3600000).toISOString(),
      endsAt: new Date(first + (i * 36 + 12) * 3600000).toISOString(),
    }));
    const result = planWeek(ctx);
    expect(result.map((c) => c.studentId)).toEqual(["2", ""]);
    expect(result[1]!.candidates.find((c) => c.id === "1")?.reasons).toContain(
      "Limite de três descansos de 24 horas em 28 dias excedido",
    );
  });
  it("reorganiza GBM e praia conjuntamente considerando a permanência publicada", () => {
    const ctx = context([
      slot("gbm", "2026-10-10", 720),
      { ...restrict(slot("praia", "2026-10-11"), ["1"]), templateCode: "GUARDA-VIDA" },
    ]);
    ctx.cadets = cadets.slice(0, 3);
    ctx.duties = [
      {
        studentId: "3",
        date: "2026-10-10",
        startsAt: "2026-10-10T06:00:00-03:00",
        endsAt: "2026-10-10T18:00:00-03:00",
      },
    ];
    expect(planWeek(ctx).map((c) => c.studentId)).toEqual(["2", "1"]);
  });
  it("melhora a cobertura mesmo quando a instrução torna outro plantão impossível", () => {
    const ctx = context([
      slot("a", "2026-10-10"),
      restrict(slot("b", "2026-10-10"), ["1"]),
      restrict(slot("instrução", "2026-10-11"), []),
    ]);
    ctx.cadets = cadets.slice(0, 2);
    const result = planWeekWithAlternatives(ctx);
    expect(result.choices.map((c) => c.studentId)).toEqual(["2", "1", ""]);
    expect(result.recoveredSlots).toBe(1);
    expect(result.searchStatus).toBe("exhausted");
  });
});

it("confere cobertura máxima em 40 cenários pequenos enumerados independentemente", () => {
  let seed = 127;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let example = 0; example < 40; example++) {
    const ctx = context(
      Array.from({ length: 4 }, (_, i) => {
        const item = slot(
          String(i),
          `2026-10-${String(5 + Math.floor(random() * 4)).padStart(2, "0")}`,
          random() < 0.5 ? 720 : 1440,
        );
        item.blocked = Object.fromEntries(
          cadets
            .slice(0, 3)
            .filter(() => random() < 0.3)
            .map((c) => [c.id, ["Bloqueado"]]),
        );
        return item;
      }),
    );
    ctx.cadets = cadets.slice(0, 3);
    let maximum = 0;
    const enumerate = (index: number, selected: { slot: WeeklySlot; id: string }[]) => {
      if (index === ctx.slots.length) {
        maximum = Math.max(maximum, selected.length);
        return;
      }
      const current = ctx.slots[index]!;
      enumerate(index + 1, selected);
      for (const cadet of ctx.cadets) {
        if (current.blocked[cadet.id]?.length) continue;
        if (
          rotationRestAvailability(
            selected.filter((s) => s.id === cadet.id).map((s) => s.slot),
            current,
          ).reasons.length
        )
          continue;
        enumerate(index + 1, [...selected, { slot: current, id: cadet.id }]);
      }
    };
    enumerate(0, []);
    const result = planWeekWithAlternatives(ctx);
    expect(result.searchStatus).not.toBe("limited");
    expect(result.choices.filter((c) => c.studentId).length).toBe(maximum);
    expect(result.choices.filter((c) => c.studentId).every((c) => !c.error)).toBe(true);
  }
});

it("encerra caso de excesso simultâneo sem explorar permutações equivalentes", () => {
  const ctx = context(Array.from({ length: 65 }, (_, i) => slot(`s${i}`, "2026-10-10")));
  ctx.cadets = Array.from({ length: 30 }, (_, i) => ({
    id: String(i),
    student_number: i,
    war_name: String(i),
  }));
  const result = planWeekWithAlternatives(ctx, {}, { maxNodes: 1 });
  expect(result.searchStatus).toBe("exhausted");
  expect(result.choices.filter((c) => c.studentId)).toHaveLength(30);
  expect(result.choices.filter((c) => c.studentId).every((c) => !c.error)).toBe(true);
});
