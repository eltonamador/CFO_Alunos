import { describe, expect, it } from "vitest";
import { parseQtsTokens, type QtsSourceToken } from "./qtsParser";

function qts(header: string, printedDate = "28/09/2026"): QtsSourceToken[] {
  return [
    { text: header, page: 1, x: 0.3, y: 0.05 },
    { text: printedDate, page: 1, x: 0.05, y: 0.3 },
    { text: "TFM I", page: 1, x: 0.2, y: 0.3 },
    { text: "06h00 – 07h30", page: 1, x: 0.4, y: 0.3 },
  ];
}

describe("vigência do QTS", () => {
  it("lê período dentro do mesmo mês", () => {
    const result = parseQtsTokens(qts("QTS Nº 017 PERÍODO DE 21 A 27/09/2026", "21/09/2026"));
    expect([result.periodStart, result.periodEnd, result.qtsNumber]).toEqual([
      "2026-09-21",
      "2026-09-27",
      "017",
    ]);
  });

  it("lê período que atravessa o mês", () => {
    const result = parseQtsTokens(qts("QTS Nº 018 PERÍODO DE 28/09 A 04/10/2026"));
    expect([result.periodStart, result.periodEnd]).toEqual(["2026-09-28", "2026-10-04"]);
    expect(result.rows[0]).toMatchObject({
      date: "2026-09-28",
      startsAt: "06:00",
      endsAt: "07:30",
    });
  });

  it("deduz o mês anterior quando só o último dia traz o mês", () => {
    const result = parseQtsTokens(qts("PERÍODO DE 28 A 04/10/2026"));
    expect([result.periodStart, result.periodEnd]).toEqual(["2026-09-28", "2026-10-04"]);
  });

  it("lê período que atravessa o ano e datas completas", () => {
    expect(parseQtsTokens(qts("PERÍODO DE 28/12 A 03/01/2027")).periodStart).toBe("2026-12-28");
    const full = parseQtsTokens(qts("PERÍODO DE 30/11/2026 ATÉ 04/12/2026"));
    expect([full.periodStart, full.periodEnd]).toEqual(["2026-11-30", "2026-12-04"]);
  });

  it("mantém a mensagem quando não há vigência", () => {
    expect(() => parseQtsTokens(qts("QTS Nº 019"))).toThrow(
      "Não encontrei o período de vigência no PDF do QTS.",
    );
  });
});
