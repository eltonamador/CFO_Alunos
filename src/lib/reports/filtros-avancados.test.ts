import { describe, expect, it } from "vitest";
import {
  applyFiltros,
  describeFiltros,
  EMPTY_FILTROS,
  type AlunoFiltravel,
} from "./filtros-avancados";

function aluno(overrides: Partial<AlunoFiltravel>): AlunoFiltravel {
  return {
    id: "s-1",
    student_number: 1,
    war_name: "RIVALDO",
    full_name: "Aluno Teste",
    pelotao: "CFO I",
    situation: "matriculado",
    sex: "M",
    enrollment_status: "confirmada",
    cpf: "000.000.000-00",
    birth_date: "2000-01-01",
    naturality_city: "Macapa",
    naturality_state: "AP",
    mother_name: "Mae",
    had_prior_military_service: false,
    prior_military_branch: null,
    prior_military_institution: null,
    religion: null,
    has_religious_restriction: false,
    student_addresses: null,
    student_logistics: null,
    vehicles: null,
    health_restrictions: null,
    has_pending_equipment: false,
    has_pending_documents: false,
    ...overrides,
  };
}

describe("filtros avancados de fardamento", () => {
  it("filtra alunos por tamanho de gandola e calca", () => {
    const alunos = [
      aluno({
        id: "s-1",
        war_name: "RIVALDO",
        student_logistics: {
          needs_housing: false,
          has_fixed_residence_macapa: true,
          gandola_size: "42M",
          pants_size: "46M",
        },
      }),
      aluno({
        id: "s-2",
        war_name: "MILENA",
        student_logistics: {
          needs_housing: false,
          has_fixed_residence_macapa: true,
          gandola_size: null,
          pants_size: null,
        },
      }),
    ];

    expect(
      applyFiltros(alunos, {
        ...EMPTY_FILTROS,
        gandola: ["42M"],
        calca: ["46M"],
      }).map((a) => a.war_name),
    ).toEqual(["RIVALDO"]);
  });

  it("descreve os criterios de gandola e calca", () => {
    expect(
      describeFiltros({
        ...EMPTY_FILTROS,
        gandola: ["42M", "44M"],
        calca: ["46M"],
      }),
    ).toEqual(["Gandola: 42M, 44M", "Calca: 46M"]);
  });
});
