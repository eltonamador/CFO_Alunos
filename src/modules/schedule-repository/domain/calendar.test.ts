import { describe, expect, it } from "vitest";
import { calendarDays, calendarRange, filterCalendar, moveCalendar } from "./calendar";

describe("calendário operacional", () => {
  it("inclui dias de outro mês na semana e anos bissextos", () => {
    expect(calendarRange("2028-03-01", "week")).toEqual({ start: "2028-02-28", end: "2028-03-05" });
    expect(calendarDays("2028-02-28", "2028-03-01")).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });
  it("navega entre meses sem saltar fevereiro quando o dia atual é 31", () => {
    expect(moveCalendar("2026-01-31", "month", 1)).toBe("2026-02-01");
    expect(calendarRange("2026-02-01", "month").end).toBe("2026-02-28");
  });
  it("filtra minhas escalas para cadetes e oficiais", () => {
    const entries = [
      {
        id: "1",
        kind: "cadet" as const,
        date: "2026-09-13",
        person: "Teste",
        duty: "Apoio",
        mine: false,
      },
      {
        id: "2",
        kind: "officer" as const,
        date: "2026-09-13",
        person: "Oficial",
        duty: "ODA",
        mine: true,
      },
    ];
    expect(filterCalendar(entries, "minhas").map((entry) => entry.id)).toEqual(["2"]);
    expect(filterCalendar(entries, "cadetes").map((entry) => entry.id)).toEqual(["1"]);
  });
});
