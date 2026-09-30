import { describe, expect, it } from "vitest";
import { officerDutyFunction, parseOfficerRosterItems, type OfficerTextItem } from "./officerRoster";

const item = (text: string, x: number, y: number): OfficerTextItem => ({ text, x, y });

describe("tabela de serviço ODA", () => {
  it("separa turnos, funções e vínculo de oficial sem ler nomes das observações", () => {
    const rows = parseOfficerRosterItems(
      [
        item("ESCALA DE SERVIÇO Nº 062/2026 – SUPERIOR DE DIA/OFICIAL DE DIA À ACADEMIA", 240, 500),
        item("14/09/2026", 80, 237),
        item("TEN CECÍLIA", 317, 241),
        item("ODA", 331, 233),
        item("CAP AMADOR", 495, 241),
        item("ODA", 510, 233),
        item("MAJ MÁRCIO COSTA", 663, 241),
        item("SUPERIOR DE DIA À ACADEMIA", 645, 233),
        item("13/09/2026", 80, 162),
        item("CAP JOSIANE", 360, 166),
        item("ODA", 375, 158),
        item("TEN HELLEN", 631, 166),
        item("ODA", 645, 158),
        item("CAP JOSIANE consta nas observações", 58, 130),
      ],
      842,
      [
        { serviceAlias: "CAP AMADOR", profileId: "amador-profile" },
        { serviceAlias: "CAP JOSIANE", profileId: "josiane-profile" },
      ],
    );
    expect(rows).toHaveLength(5);
    expect(rows.find((row) => row.display_name === "CAP AMADOR")).toMatchObject({
      duty_date: "2026-09-14",
      shift: "tarde",
      starts_at: "13:00",
      profile_id: "amador-profile",
    });
    expect(rows.find((row) => row.display_name === "MAJ MÁRCIO COSTA")).toMatchObject({
      duty_function: "Superior de dia",
      shift: "noite",
    });
    expect(rows.find((row) => row.display_name === "CAP JOSIANE")).toMatchObject({
      duty_date: "2026-09-13",
      shift: "diurno",
      profile_id: "josiane-profile",
    });
  });

  it("ignora páginas que não são a escala ODA", () => {
    expect(parseOfficerRosterItems([item("13/09/2026", 80, 162), item("CAP JOSIANE", 360, 166)], 842, [])).toEqual([]);
  });
});

describe("função por posto", () => {
  it.each([
    ["MAJ MÁRCIO COSTA", "ODA", "Superior de dia"],
    ["MAJ LUANA", "SUPERIOR DE DIA À ACADEMIA", "Superior de dia"],
    ["CAP NAHUM", "SUPERIOR DE DIA À ACADEMIA", "Oficial de dia"],
    ["TEN CECÍLIA", "ODA", "Oficial de dia"],
    ["1º TEN HELLEN", "ODA", "Oficial de dia"],
    ["2º TEN DIONÍSIO", "ODA", "Oficial de dia"],
    ["CAPITÃO TRAJANO", "ODA", "Oficial de dia"],
    ["TEN CEL SILVA", "Superior de dia", "Superior de dia"],
    ["TENENTE-CORONEL SILVA", "Superior de dia", "Superior de dia"],
    ["SGT SILVA", "Permanência", "Permanência"],
  ])("%s: %s → %s", (name, source, expected) => {
    expect(officerDutyFunction(name, source)).toBe(expected);
  });
});
