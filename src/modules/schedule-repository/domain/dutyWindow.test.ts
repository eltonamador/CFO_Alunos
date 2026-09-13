import { describe, expect, it } from "vitest";
import { dutyWindow } from "./dutyWindow";

describe("janela de serviço no horário de Belém", () => {
  it("muda o dia apenas à meia-noite local", () => {
    expect(dutyWindow(new Date("2026-09-14T02:59:00Z"))).toEqual({
      today: "2026-09-13",
      tomorrow: "2026-09-14",
    });
    expect(dutyWindow(new Date("2026-09-14T03:00:00Z"))).toEqual({
      today: "2026-09-14",
      tomorrow: "2026-09-15",
    });
  });

  it("atravessa a virada do ano", () => {
    expect(dutyWindow(new Date("2027-01-01T02:30:00Z"))).toEqual({
      today: "2026-12-31",
      tomorrow: "2027-01-01",
    });
  });
});
