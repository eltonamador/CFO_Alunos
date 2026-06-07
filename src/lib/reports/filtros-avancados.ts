/**
 * Filtros Avançados — utilidades compartilhadas (client + server).
 *
 * Categorias:
 *   - Identificação:  sexo, status matrícula, situação ficha
 *   - Origem:         reside no AP, UF de endereço, naturalidade
 *   - Saúde (LGPD):   alergia, medicação contínua, restrição física, qualquer restrição
 *   - Logística:      CNH, veículo, alojamento, exp. militar anterior, pend. enxoval
 *   - Documentos:     documento pendente
 *   - Religião:       possui restrição religiosa
 *
 * Os critérios são aplicados sobre o conjunto de alunos já carregado
 * pela página server (RLS já filtrou o que cada perfil pode ver),
 * mantendo o resultado em tempo real sem novas queries.
 */

// ──────────────────────────────────────────────────────────────────────
// Tipos dos filtros
// ──────────────────────────────────────────────────────────────────────
export type SexoFilter = "M" | "F" | "ni";
export type EnrollmentFilter = "pendente" | "confirmada";
export type FichaSituacao = "completa" | "incompleta" | "nao_iniciada";

export type ResideApFilter = "sim" | "nao" | "ni";
export type BoolFilter = "sim" | "nao";

export type InstituicaoMilitar =
  | "corpo_de_bombeiros_militar"
  | "policia_militar"
  | "forcas_armadas"
  | "outra";

export interface FiltrosState {
  // Identificação
  sexo: SexoFilter[];
  enrollment: EnrollmentFilter[];
  ficha: FichaSituacao[];
  // Origem
  resideAp: ResideApFilter[];
  vemDeOutroEstado: BoolFilter[];
  ufEndereco: string; // texto livre, contém
  // Saúde (LGPD)
  temAlergia: BoolFilter[];
  usaMedicacao: BoolFilter[];
  temRestricaoFisica: BoolFilter[];
  // Logística
  temCnh: BoolFilter[];
  temVeiculo: BoolFilter[];
  necessitaAlojamento: BoolFilter[];
  gandola: string[];
  calca: string[];
  expMilitar: BoolFilter[];
  instituicaoMilitar: InstituicaoMilitar[];
  pendMaterial: BoolFilter[];
  // Documentos
  pendDocumento: BoolFilter[];
  // Religião
  restricaoReligiosa: BoolFilter[];
}

export const EMPTY_FILTROS: FiltrosState = {
  sexo: [],
  enrollment: [],
  ficha: [],
  resideAp: [],
  vemDeOutroEstado: [],
  ufEndereco: "",
  temAlergia: [],
  usaMedicacao: [],
  temRestricaoFisica: [],
  temCnh: [],
  temVeiculo: [],
  necessitaAlojamento: [],
  gandola: [],
  calca: [],
  expMilitar: [],
  instituicaoMilitar: [],
  pendMaterial: [],
  pendDocumento: [],
  restricaoReligiosa: [],
};

// ──────────────────────────────────────────────────────────────────────
// Forma do registro de aluno que a página server carrega
// ──────────────────────────────────────────────────────────────────────
export interface AlunoFiltravel {
  id: string;
  student_number: number | null;
  war_name: string;
  full_name: string;
  pelotao: string | null;
  situation: string;
  sex: "M" | "F" | null;
  enrollment_status: "pendente" | "confirmada" | null;
  cpf: string | null;
  birth_date: string | null;
  naturality_city: string | null;
  naturality_state: string | null;
  mother_name: string | null;
  had_prior_military_service: boolean | null;
  prior_military_branch: InstituicaoMilitar | null;
  prior_military_institution: string | null;
  religion: string | null;
  has_religious_restriction: boolean | null;
  // Sub-tabelas (1:1 via select aninhado do Supabase)
  student_addresses: {
    state: string | null;
    city: string | null;
    origin_in_amapa: boolean | null;
    from_other_state: boolean | null;
  } | null;
  student_logistics: {
    needs_housing: boolean | null;
    has_fixed_residence_macapa: boolean | null;
    gandola_size: string | null;
    pants_size: string | null;
  } | null;
  vehicles: {
    has_cnh: boolean | null;
    cnh_category: string | null;
    has_vehicle: boolean | null;
  } | null;
  health_restrictions: {
    has_allergies: boolean | null;
    has_continuous_medication: boolean | null;
    has_physical_restriction: boolean | null;
    has_dietary_restriction: boolean | null;
    has_chronic_disease: boolean | null;
    has_eye_surgery: boolean | null;
    allergies: string | null;
    continuous_medication: string | null;
    physical_restriction: string | null;
    dietary_restriction: string | null;
    chronic_disease: string | null;
  } | null;
  weight_summary?: {
    currentWeightKg: number | null;
    lastMeasuredAt: string | null;
    count: number;
    variationKg: number | null;
  } | null;
  // Flags pré-computados pela página server
  has_pending_equipment: boolean;
  has_pending_documents: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// SELECT compartilhado para o Supabase
// ──────────────────────────────────────────────────────────────────────
export const STUDENT_SELECT_COLUMNS = `
  id, student_number, war_name, full_name, pelotao, situation, sex, enrollment_status,
  cpf, birth_date, naturality_city, naturality_state, mother_name,
  had_prior_military_service, prior_military_branch, prior_military_institution,
  religion, has_religious_restriction,
  student_addresses(state, city, origin_in_amapa, from_other_state),
  student_logistics(needs_housing, has_fixed_residence_macapa, gandola_size, pants_size),
  vehicles(has_cnh, cnh_category, has_vehicle),
  health_restrictions(
    has_allergies, has_continuous_medication, has_physical_restriction,
    has_dietary_restriction, has_chronic_disease, has_eye_surgery,
    allergies, continuous_medication, physical_restriction, dietary_restriction, chronic_disease
  )
`;

// ──────────────────────────────────────────────────────────────────────
// Helpers derivados
// ──────────────────────────────────────────────────────────────────────
const FICHA_CAMPOS_CHAVE = ["cpf", "birth_date", "naturality_city", "mother_name"] as const;

export function computeFichaSituacao(a: AlunoFiltravel): FichaSituacao {
  const preenchidos = FICHA_CAMPOS_CHAVE.filter((k) => {
    const v = a[k];
    return typeof v === "string" && v.trim().length > 0;
  }).length;
  if (preenchidos === 0) return "nao_iniciada";
  if (preenchidos === FICHA_CAMPOS_CHAVE.length) return "completa";
  return "incompleta";
}

function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

export function comesFromOtherState(a: AlunoFiltravel): boolean {
  const addr = a.student_addresses;
  if (!addr) return false;
  if (typeof addr.from_other_state === "boolean") return addr.from_other_state;
  if (typeof addr.origin_in_amapa === "boolean") return !addr.origin_in_amapa;
  if (nonEmpty(addr.state)) return addr.state!.trim().toUpperCase() !== "AP";
  return false;
}

export function residesInAmapa(a: AlunoFiltravel): boolean | null {
  // origin_in_amapa preferencial; fallback para state == 'AP'
  const addr = a.student_addresses;
  if (!addr) return null;
  if (typeof addr.origin_in_amapa === "boolean") return addr.origin_in_amapa;
  if (typeof addr.from_other_state === "boolean") return !addr.from_other_state;
  if (nonEmpty(addr.state)) return addr.state?.trim().toUpperCase() === "AP";
  return null;
}

// Filtros de saúde usam booleanos explícitos (has_*) — preenchidos pela
// migração 0028 a partir dos textos antigos. Texto vazio ou contendo
// "nenhum/não" NÃO conta como ocorrência positiva.
export const hasAllergy = (a: AlunoFiltravel) =>
  Boolean(a.health_restrictions?.has_allergies);
export const usesMedication = (a: AlunoFiltravel) =>
  Boolean(a.health_restrictions?.has_continuous_medication);
export const hasPhysicalRestriction = (a: AlunoFiltravel) =>
  Boolean(a.health_restrictions?.has_physical_restriction);

export const hasCnh = (a: AlunoFiltravel) => Boolean(a.vehicles?.has_cnh);
export const hasVehicle = (a: AlunoFiltravel) => Boolean(a.vehicles?.has_vehicle);
export const needsHousing = (a: AlunoFiltravel) => Boolean(a.student_logistics?.needs_housing);
export const uniformValue = (value: string | null | undefined) =>
  value?.trim().toUpperCase() || "";
export const hasPriorMilitary = (a: AlunoFiltravel) =>
  Boolean(a.had_prior_military_service);

export const hasReligiousRestriction = (a: AlunoFiltravel) =>
  Boolean(a.has_religious_restriction);

// ──────────────────────────────────────────────────────────────────────
// Aplicação dos filtros
// ──────────────────────────────────────────────────────────────────────
function inSet<T>(selected: T[], value: T): boolean {
  return selected.length === 0 || selected.includes(value);
}

function matchBool(selected: BoolFilter[], value: boolean): boolean {
  if (selected.length === 0) return true;
  return selected.includes(value ? "sim" : "nao");
}

function matchTextSelection(selected: string[], value: string | null | undefined): boolean {
  if (selected.length === 0) return true;
  const normalized = uniformValue(value);
  return selected.map(uniformValue).includes(normalized);
}

export function applyFiltros(alunos: AlunoFiltravel[], f: FiltrosState): AlunoFiltravel[] {
  const uf = f.ufEndereco.trim().toUpperCase();

  return alunos.filter((a) => {
    // Sexo
    const sexoKey: SexoFilter = a.sex === "M" ? "M" : a.sex === "F" ? "F" : "ni";
    if (!inSet(f.sexo, sexoKey)) return false;
    // Matrícula
    const enr = (a.enrollment_status ?? "pendente") as EnrollmentFilter;
    if (!inSet(f.enrollment, enr)) return false;
    // Ficha
    if (!inSet(f.ficha, computeFichaSituacao(a))) return false;

    // Reside AP
    if (f.resideAp.length > 0) {
      const r = residesInAmapa(a);
      const key: ResideApFilter = r === true ? "sim" : r === false ? "nao" : "ni";
      if (!f.resideAp.includes(key)) return false;
    }

    // Vem de outro estado (explícito; fallback a derivação)
    if (!matchBool(f.vemDeOutroEstado, comesFromOtherState(a))) return false;

    // UF (texto livre, contém)
    if (uf.length > 0) {
      const state = (a.student_addresses?.state ?? "").toUpperCase();
      if (!state.includes(uf)) return false;
    }

    // Saúde
    if (!matchBool(f.temAlergia, hasAllergy(a))) return false;
    if (!matchBool(f.usaMedicacao, usesMedication(a))) return false;
    if (!matchBool(f.temRestricaoFisica, hasPhysicalRestriction(a))) return false;

    // Logística
    if (!matchBool(f.temCnh, hasCnh(a))) return false;
    if (!matchBool(f.temVeiculo, hasVehicle(a))) return false;
    if (!matchBool(f.necessitaAlojamento, needsHousing(a))) return false;
    if (!matchTextSelection(f.gandola, a.student_logistics?.gandola_size)) return false;
    if (!matchTextSelection(f.calca, a.student_logistics?.pants_size)) return false;
    if (!matchBool(f.expMilitar, hasPriorMilitary(a))) return false;
    if (f.instituicaoMilitar.length > 0) {
      const b = a.prior_military_branch;
      if (!b || !f.instituicaoMilitar.includes(b)) return false;
    }
    if (!matchBool(f.pendMaterial, a.has_pending_equipment)) return false;

    // Documentos
    if (!matchBool(f.pendDocumento, a.has_pending_documents)) return false;

    // Religião
    if (!matchBool(f.restricaoReligiosa, hasReligiousRestriction(a))) return false;

    return true;
  });
}

// ──────────────────────────────────────────────────────────────────────
// Estatísticas
// ──────────────────────────────────────────────────────────────────────
export interface ResumoEstatisticas {
  total: number;
  filtrados: number;
  percentual: number;
  porSexo: { masculino: number; feminino: number; naoInformado: number };
  porMatricula: { confirmada: number; pendente: number };
  porFicha: { completa: number; incompleta: number; naoIniciada: number };
  porOrigem: { ap: number; foraAp: number; naoInformado: number; outroEstado: number };
  porSaude: { alergia: number; medicacao: number; restricaoFisica: number };
  porLogistica: { cnh: number; veiculo: number; expMilitar: number; pendMaterial: number };
  porDocumentos: { pendentes: number };
}

export function computeResumo(
  alunos: AlunoFiltravel[],
  filtrados: AlunoFiltravel[],
): ResumoEstatisticas {
  const total = alunos.length;
  const f = filtrados;
  const count = (arr: AlunoFiltravel[], pred: (a: AlunoFiltravel) => boolean) =>
    arr.reduce((n, a) => (pred(a) ? n + 1 : n), 0);

  return {
    total,
    filtrados: f.length,
    percentual: total > 0 ? Math.round((f.length / total) * 1000) / 10 : 0,
    porSexo: {
      masculino: count(f, (a) => a.sex === "M"),
      feminino: count(f, (a) => a.sex === "F"),
      naoInformado: count(f, (a) => a.sex !== "M" && a.sex !== "F"),
    },
    porMatricula: {
      confirmada: count(f, (a) => (a.enrollment_status ?? "pendente") === "confirmada"),
      pendente: count(f, (a) => (a.enrollment_status ?? "pendente") === "pendente"),
    },
    porFicha: {
      completa: count(f, (a) => computeFichaSituacao(a) === "completa"),
      incompleta: count(f, (a) => computeFichaSituacao(a) === "incompleta"),
      naoIniciada: count(f, (a) => computeFichaSituacao(a) === "nao_iniciada"),
    },
    porOrigem: {
      ap: count(f, (a) => residesInAmapa(a) === true),
      foraAp: count(f, (a) => residesInAmapa(a) === false),
      naoInformado: count(f, (a) => residesInAmapa(a) === null),
      outroEstado: count(f, comesFromOtherState),
    },
    porSaude: {
      alergia: count(f, hasAllergy),
      medicacao: count(f, usesMedication),
      restricaoFisica: count(f, hasPhysicalRestriction),
    },
    porLogistica: {
      cnh: count(f, hasCnh),
      veiculo: count(f, hasVehicle),
      expMilitar: count(f, hasPriorMilitary),
      pendMaterial: count(f, (a) => a.has_pending_equipment),
    },
    porDocumentos: {
      pendentes: count(f, (a) => a.has_pending_documents),
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Descrição textual dos filtros (usada nos relatórios)
// ──────────────────────────────────────────────────────────────────────
function labelBool(arr: BoolFilter[]): string {
  return arr.map((v) => (v === "sim" ? "Sim" : "Não")).join(", ");
}

const INSTITUICAO_LABEL: Record<InstituicaoMilitar, string> = {
  corpo_de_bombeiros_militar: "CBM",
  policia_militar: "PM",
  forcas_armadas: "Forças Armadas",
  outra: "Outra",
};

export function describeFiltros(f: FiltrosState): string[] {
  const out: string[] = [];

  if (f.sexo.length) {
    const labels = f.sexo.map((s) =>
      s === "M" ? "Masculino" : s === "F" ? "Feminino" : "Não informado",
    );
    out.push(`Sexo: ${labels.join(", ")}`);
  }
  if (f.enrollment.length) {
    out.push(
      `Matrícula: ${f.enrollment.map((s) => (s === "confirmada" ? "Confirmada" : "Pendente")).join(", ")}`,
    );
  }
  if (f.ficha.length) {
    out.push(
      `Situação da ficha: ${f.ficha
        .map((s) => (s === "completa" ? "Completa" : s === "incompleta" ? "Incompleta" : "Não iniciada"))
        .join(", ")}`,
    );
  }

  if (f.resideAp.length) {
    out.push(
      `Reside no AP: ${f.resideAp.map((v) => (v === "sim" ? "Sim" : v === "nao" ? "Não" : "Não informado")).join(", ")}`,
    );
  }
  if (f.vemDeOutroEstado.length)
    out.push(`Vem de outro estado: ${labelBool(f.vemDeOutroEstado)}`);
  if (f.ufEndereco.trim()) out.push(`UF de endereço contém: ${f.ufEndereco.trim().toUpperCase()}`);

  if (f.temAlergia.length) out.push(`Alergia: ${labelBool(f.temAlergia)}`);
  if (f.usaMedicacao.length) out.push(`Medicação contínua: ${labelBool(f.usaMedicacao)}`);
  if (f.temRestricaoFisica.length)
    out.push(`Restrição física: ${labelBool(f.temRestricaoFisica)}`);

  if (f.temCnh.length) out.push(`Possui CNH: ${labelBool(f.temCnh)}`);
  if (f.temVeiculo.length) out.push(`Possui veículo: ${labelBool(f.temVeiculo)}`);
  if (f.necessitaAlojamento.length)
    out.push(`Necessita alojamento: ${labelBool(f.necessitaAlojamento)}`);
  if (f.gandola.length) out.push(`Gandola: ${f.gandola.map(uniformValue).join(", ")}`);
  if (f.calca.length) out.push(`Calca: ${f.calca.map(uniformValue).join(", ")}`);
  if (f.expMilitar.length) out.push(`Experiência militar anterior: ${labelBool(f.expMilitar)}`);
  if (f.instituicaoMilitar.length) {
    out.push(
      `Instituição militar anterior: ${f.instituicaoMilitar.map((i) => INSTITUICAO_LABEL[i]).join(", ")}`,
    );
  }
  if (f.pendMaterial.length) out.push(`Pendência de material: ${labelBool(f.pendMaterial)}`);

  if (f.pendDocumento.length) out.push(`Documento pendente: ${labelBool(f.pendDocumento)}`);

  if (f.restricaoReligiosa.length)
    out.push(`Restrição religiosa: ${labelBool(f.restricaoReligiosa)}`);

  if (out.length === 0) out.push("Nenhum filtro aplicado (turma inteira)");
  return out;
}
