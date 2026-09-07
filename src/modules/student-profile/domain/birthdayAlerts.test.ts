import { describe, expect, it } from "vitest";
import { formatBirthdayDate, getBirthdayAlerts } from "./birthdayAlerts";

describe("getBirthdayAlerts", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");

  it("identifica aniversários de hoje e amanhã e calcula a idade do ano da ocorrência", () => {
    const alerts = getBirthdayAlerts(
      [
        { id: "tomorrow", fullName: "Maria Souza", birthDate: "2002-09-08" },
        { id: "today", fullName: "João Silva", birthDate: "2003-09-07" },
      ],
      now,
    );

    expect(alerts).toEqual([
      {
        studentId: "today",
        cadetName: "João Silva",
        birthDate: "2003-09-07",
        occurrenceDate: "2026-09-07",
        age: 23,
        period: "today",
      },
      {
        studentId: "tomorrow",
        cadetName: "Maria Souza",
        birthDate: "2002-09-08",
        occurrenceDate: "2026-09-08",
        age: 24,
        period: "tomorrow",
      },
    ]);
  });

  it("não gera alerta fora da janela de hoje e amanhã ou sem data válida", () => {
    const alerts = getBirthdayAlerts(
      [
        { id: "later", fullName: "Fora da janela", birthDate: "2000-09-09" },
        { id: "past", fullName: "Data passada", birthDate: "2000-09-06" },
        { id: "missing", fullName: "Sem data", birthDate: null },
        { id: "invalid", fullName: "Data inválida", birthDate: "2000-02-30" },
      ],
      now,
    );

    expect(alerts).toEqual([]);
  });

  it("usa o fuso de Macapá/Belém sem deslocar a data civil", () => {
    const lateEveningInBelem = new Date("2026-09-08T01:00:00.000Z");
    const alerts = getBirthdayAlerts(
      [{ id: "today", fullName: "Cadete Teste", birthDate: "2000-09-07" }],
      lateEveningInBelem,
    );

    expect(alerts[0]).toMatchObject({ period: "today", age: 26 });
  });

  it("calcula a idade com o ano seguinte quando amanhã cruza o réveillon", () => {
    const newYearsEve = new Date("2026-12-31T15:00:00.000Z");
    const alerts = getBirthdayAlerts(
      [{ id: "new-year", fullName: "Cadete Janeiro", birthDate: "2000-01-01" }],
      newYearsEve,
    );

    expect(alerts[0]).toMatchObject({
      period: "tomorrow",
      occurrenceDate: "2027-01-01",
      age: 27,
    });
  });
});

describe("formatBirthdayDate", () => {
  it("formata uma data civil sem conversão de fuso", () => {
    expect(formatBirthdayDate("2026-09-07")).toBe("07/09/2026");
  });
});
