import { describe, expect, it } from "vitest";
import { previewCadetTable, type ImportStudent, type ImportToken } from "./importPreview";

const students: ImportStudent[] = [
  {
    id: "a",
    classId: "class",
    fullName: "Cadete Alfa Lima",
    warName: "Alfa Lima",
    studentNumber: 1,
    registration: "1234567",
  },
  {
    id: "b",
    classId: "class",
    fullName: "Cadete Beta",
    warName: "Beta",
    studentNumber: 2,
    registration: "7654321",
  },
];
function token(text: string, x: number, y: number, width = 0.05): ImportToken {
  return { text, x, y, width, height: 0.025, page: 1 };
}
const header = [
  token("Dia ao 1º", 0.42, 0.07, 0.08),
  token("Ano", 0.51, 0.07),
  token("Apoio 1", 0.61, 0.07, 0.08),
  token("Apoio 2", 0.75, 0.07, 0.08),
];

describe("conferência da tabela extraída", () => {
  it("preserva o primeiro nome da primeira coluna e separa turnos repetidos", () => {
    const tokens = [
      ...header,
      token("12/09/2026", 0.03, 0.2, 0.11),
      token("1º turno", 0.31, 0.2, 0.08),
      token("Alfa", 0.44, 0.2),
      token("Lima", 0.49, 0.2),
      token("Beta", 0.61, 0.2),
      token("12/09/2026", 0.03, 0.3, 0.11),
      token("2º turno", 0.31, 0.3, 0.08),
      token("Alfa", 0.44, 0.3),
      token("Lima", 0.49, 0.3),
      token("Desconhecido", 0.61, 0.3, 0.08),
    ];
    const rows = previewCadetTable(tokens, students, "Escala");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      person: "Alfa Lima",
      studentId: "a",
      dutyFunction: "Dia ao 1º Ano",
      shift: "1º turno",
    });
    expect(rows[2]).toMatchObject({ studentId: "a", shift: "2º turno" });
    expect(rows[3]).toMatchObject({ person: "Desconhecido", studentId: "" });
  });
  it("não transforma data impossível em outra data válida", () => {
    expect(
      previewCadetTable(
        [...header, token("31/02/2026", 0.03, 0.2), token("Alfa Lima", 0.44, 0.2)],
        students,
        "Escala",
      ).every((row) => !row.date),
    ).toBe(true);
  });
  it("mantém ambiguidades para seleção humana", () => {
    const rows = previewCadetTable(
      [...header, token("12/09/2026", 0.03, 0.2), token("Alfa Lima", 0.44, 0.2, 0.09)],
      [...students, { ...students[0]!, id: "other" }],
      "Escala",
    );
    expect(rows[0]?.studentId).toBe("");
  });
});
