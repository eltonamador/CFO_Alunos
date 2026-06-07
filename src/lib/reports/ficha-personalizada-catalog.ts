/**
 * Catálogo compartilhado (client + server) de campos da Ficha Personalizada.
 *
 * Cada campo expõe:
 *   - id:     identificador estável (prefixo `fp_<grupo>_<chave>`)
 *   - groupId: aba a que pertence (corresponde às 11 abas da ficha do aluno)
 *   - label:  rótulo curto exibido no PDF e no modal
 *   - minPx:  largura MÍNIMA legível para a coluna no A4 paisagem
 *             (usada no cálculo de "cabe ou não cabe" — ver `evaluateSelection`)
 *   - weight: peso relativo usado para distribuir o espaço útil no PDF
 *
 * Não importe pdfkit nem supabase aqui — este arquivo precisa rodar no
 * client (modal) também.
 */

export type FichaGroupId =
  | "resumo"
  | "identificacao"
  | "contato"
  | "endereco"
  | "emergencia"
  | "saude"
  | "logistica"
  | "veiculo"
  | "documentos"
  | "materiais"
  | "historico";

export interface FichaField {
  id: string;
  groupId: FichaGroupId;
  label: string;
  minPx: number;
  weight: number;
}

export interface FichaGroup {
  id: FichaGroupId;
  label: string;
  description?: string;
}

export const FICHA_GROUPS: FichaGroup[] = [
  { id: "resumo", label: "Resumo", description: "Identificação rápida do aluno" },
  { id: "identificacao", label: "Identificação", description: "Dados pessoais e documentos" },
  { id: "contato", label: "Contato", description: "Telefones e e-mails" },
  { id: "endereco", label: "Endereço / Origem", description: "Residência atual e origem" },
  { id: "emergencia", label: "Emergência", description: "Contatos prioritários" },
  { id: "saude", label: "Saúde", description: "Restrições, alergias, medicações (LGPD)" },
  { id: "logistica", label: "Logística", description: "Moradia, deslocamento" },
  { id: "veiculo", label: "Veículo / CNH", description: "Habilitação e veículo" },
  { id: "documentos", label: "Documentos", description: "Resumo de status de docs" },
  { id: "materiais", label: "Materiais", description: "Resumo de enxoval" },
  { id: "historico", label: "Histórico", description: "Serviço militar anterior e religião" },
];

// =====================================================================
// Catálogo de campos
// =====================================================================
// minPx escolhido empiricamente para fonte Helvetica 8.5pt no PDF:
//   - 2 caracteres alfanuméricos  ≈ 18px
//   - "Sim/Não"                    ≈ 32px
//   - CPF/CNPJ/Telefone formatado ≈ 78px
//   - Endereços e textos livres   ≈ 120-160px
// =====================================================================

export const FICHA_FIELDS: FichaField[] = [
  // ── Resumo ────────────────────────────────────────────────────────
  { id: "fp_resumo_numero", groupId: "resumo", label: "Nº", minPx: 26, weight: 0.04 },
  { id: "fp_resumo_war_name", groupId: "resumo", label: "Nome de Guerra", minPx: 80, weight: 0.1 },
  { id: "fp_resumo_pelotao", groupId: "resumo", label: "Pelotão", minPx: 55, weight: 0.07 },
  { id: "fp_resumo_situation", groupId: "resumo", label: "Situação", minPx: 70, weight: 0.08 },
  { id: "fp_resumo_enrollment", groupId: "resumo", label: "Matrícula", minPx: 70, weight: 0.08 },

  // ── Identificação ─────────────────────────────────────────────────
  { id: "fp_id_full_name", groupId: "identificacao", label: "Nome Completo", minPx: 130, weight: 0.16 },
  { id: "fp_id_cpf", groupId: "identificacao", label: "CPF", minPx: 78, weight: 0.09 },
  { id: "fp_id_rg", groupId: "identificacao", label: "RG", minPx: 60, weight: 0.07 },
  { id: "fp_id_birth_date", groupId: "identificacao", label: "Nasc.", minPx: 56, weight: 0.06 },
  { id: "fp_id_sex", groupId: "identificacao", label: "Sexo", minPx: 30, weight: 0.04 },
  { id: "fp_id_marital", groupId: "identificacao", label: "Est. Civil", minPx: 60, weight: 0.07 },
  { id: "fp_id_education", groupId: "identificacao", label: "Escolaridade", minPx: 90, weight: 0.1 },
  { id: "fp_id_graduation_name", groupId: "identificacao", label: "Curso/Grad.", minPx: 100, weight: 0.11 },
  { id: "fp_id_nationality", groupId: "identificacao", label: "Nacion.", minPx: 60, weight: 0.07 },
  { id: "fp_id_naturality", groupId: "identificacao", label: "Naturalidade", minPx: 100, weight: 0.11 },
  { id: "fp_id_father", groupId: "identificacao", label: "Pai", minPx: 110, weight: 0.13 },
  { id: "fp_id_mother", groupId: "identificacao", label: "Mãe", minPx: 110, weight: 0.13 },
  { id: "fp_id_pis", groupId: "identificacao", label: "PIS", minPx: 80, weight: 0.09 },
  { id: "fp_id_voter", groupId: "identificacao", label: "Título eleitor", minPx: 90, weight: 0.1 },
  { id: "fp_id_presentation", groupId: "identificacao", label: "Apresentação", minPx: 70, weight: 0.08 },
  { id: "fp_id_professional", groupId: "identificacao", label: "Exp. Profissional", minPx: 130, weight: 0.15 },

  // ── Contato ───────────────────────────────────────────────────────
  { id: "fp_contato_whatsapp", groupId: "contato", label: "WhatsApp", minPx: 82, weight: 0.1 },
  { id: "fp_contato_phone2", groupId: "contato", label: "Tel. secundário", minPx: 82, weight: 0.1 },
  { id: "fp_contato_email", groupId: "contato", label: "E-mail pessoal", minPx: 130, weight: 0.15 },
  { id: "fp_contato_email_inst", groupId: "contato", label: "E-mail institucional", minPx: 130, weight: 0.15 },

  // ── Endereço / Origem ─────────────────────────────────────────────
  { id: "fp_end_street", groupId: "endereco", label: "Rua", minPx: 110, weight: 0.13 },
  { id: "fp_end_district", groupId: "endereco", label: "Bairro", minPx: 75, weight: 0.09 },
  { id: "fp_end_city", groupId: "endereco", label: "Cidade", minPx: 70, weight: 0.08 },
  { id: "fp_end_state", groupId: "endereco", label: "UF", minPx: 26, weight: 0.04 },
  { id: "fp_end_zip", groupId: "endereco", label: "CEP", minPx: 56, weight: 0.06 },
  { id: "fp_end_landmark", groupId: "endereco", label: "Ponto ref.", minPx: 100, weight: 0.11 },
  { id: "fp_end_origin_ap", groupId: "endereco", label: "Origem AP?", minPx: 56, weight: 0.06 },
  { id: "fp_end_other_state", groupId: "endereco", label: "Outro estado?", minPx: 56, weight: 0.06 },
  { id: "fp_end_origin_state", groupId: "endereco", label: "UF origem", minPx: 56, weight: 0.06 },
  { id: "fp_end_origin_city", groupId: "endereco", label: "Cidade origem", minPx: 90, weight: 0.1 },

  // ── Emergência ────────────────────────────────────────────────────
  { id: "fp_em_c1_nome", groupId: "emergencia", label: "Emerg.1 Nome", minPx: 100, weight: 0.12 },
  { id: "fp_em_c1_parent", groupId: "emergencia", label: "Emerg.1 Parent.", minPx: 70, weight: 0.08 },
  { id: "fp_em_c1_tel", groupId: "emergencia", label: "Emerg.1 Tel.", minPx: 82, weight: 0.1 },
  { id: "fp_em_c1_end", groupId: "emergencia", label: "Emerg.1 Endereço", minPx: 130, weight: 0.15 },
  { id: "fp_em_c2_nome", groupId: "emergencia", label: "Emerg.2 Nome", minPx: 100, weight: 0.12 },
  { id: "fp_em_c2_parent", groupId: "emergencia", label: "Emerg.2 Parent.", minPx: 70, weight: 0.08 },
  { id: "fp_em_c2_tel", groupId: "emergencia", label: "Emerg.2 Tel.", minPx: 82, weight: 0.1 },
  { id: "fp_em_c2_end", groupId: "emergencia", label: "Emerg.2 Endereço", minPx: 130, weight: 0.15 },

  // ── Saúde (LGPD) ──────────────────────────────────────────────────
  { id: "fp_sa_blood", groupId: "saude", label: "Sangue/RH", minPx: 50, weight: 0.06 },
  { id: "fp_sa_altura", groupId: "saude", label: "Altura", minPx: 40, weight: 0.05 },
  { id: "fp_sa_peso", groupId: "saude", label: "Peso atual", minPx: 52, weight: 0.06 },
  { id: "fp_sa_peso_data", groupId: "saude", label: "Última medição", minPx: 70, weight: 0.08 },
  { id: "fp_sa_peso_registros", groupId: "saude", label: "Reg. peso", minPx: 48, weight: 0.05 },
  { id: "fp_sa_alergias", groupId: "saude", label: "Alergias", minPx: 110, weight: 0.13 },
  { id: "fp_sa_medicacao", groupId: "saude", label: "Medicação contínua", minPx: 110, weight: 0.13 },
  { id: "fp_sa_doenca", groupId: "saude", label: "Doença / Restr. física", minPx: 110, weight: 0.13 },
  { id: "fp_sa_alimentar", groupId: "saude", label: "Restr. alimentar", minPx: 90, weight: 0.1 },
  { id: "fp_sa_oculos", groupId: "saude", label: "Óculos", minPx: 38, weight: 0.05 },
  { id: "fp_sa_cir_ocular", groupId: "saude", label: "Cirurgia ocular", minPx: 75, weight: 0.09 },
  { id: "fp_sa_resumo", groupId: "saude", label: "Resumo operacional", minPx: 130, weight: 0.15 },
  { id: "fp_sa_validacao", groupId: "saude", label: "Validação saúde", minPx: 70, weight: 0.08 },

  // ── Logística ─────────────────────────────────────────────────────
  { id: "fp_log_residencia_macapa", groupId: "logistica", label: "Resid. Macapá?", minPx: 60, weight: 0.07 },
  { id: "fp_log_course_address", groupId: "logistica", label: "Endereço no curso", minPx: 130, weight: 0.15 },
  { id: "fp_log_needs_housing", groupId: "logistica", label: "Precisa moradia?", minPx: 60, weight: 0.07 },
  { id: "fp_log_family_ap", groupId: "logistica", label: "Família em AP?", minPx: 60, weight: 0.07 },
  { id: "fp_log_local_contact", groupId: "logistica", label: "Contato local", minPx: 110, weight: 0.13 },
  { id: "fp_log_gandola", groupId: "logistica", label: "Gandola", minPx: 48, weight: 0.05 },
  { id: "fp_log_calca", groupId: "logistica", label: "Calça", minPx: 48, weight: 0.05 },

  // ── Veículo / CNH ─────────────────────────────────────────────────
  { id: "fp_vei_has_vehicle", groupId: "veiculo", label: "Tem veículo?", minPx: 56, weight: 0.06 },
  { id: "fp_vei_type", groupId: "veiculo", label: "Tipo", minPx: 55, weight: 0.06 },
  { id: "fp_vei_brand_model", groupId: "veiculo", label: "Marca / Modelo", minPx: 100, weight: 0.11 },
  { id: "fp_vei_plate", groupId: "veiculo", label: "Placa", minPx: 60, weight: 0.07 },
  { id: "fp_vei_has_cnh", groupId: "veiculo", label: "Tem CNH?", minPx: 50, weight: 0.06 },
  { id: "fp_vei_cnh_cat", groupId: "veiculo", label: "Cat. CNH", minPx: 50, weight: 0.06 },
  { id: "fp_vei_cnh_valid", groupId: "veiculo", label: "Validade CNH", minPx: 70, weight: 0.08 },
  { id: "fp_vei_available", groupId: "veiculo", label: "Disp. emprego op.", minPx: 60, weight: 0.07 },

  // ── Documentos (agregados) ────────────────────────────────────────
  { id: "fp_doc_enviados", groupId: "documentos", label: "Docs enviados", minPx: 60, weight: 0.07 },
  { id: "fp_doc_pendentes", groupId: "documentos", label: "Docs pendentes", minPx: 60, weight: 0.07 },
  { id: "fp_doc_rejeitados", groupId: "documentos", label: "Docs rejeitados", minPx: 60, weight: 0.07 },

  // ── Materiais (agregados) ─────────────────────────────────────────
  { id: "fp_mat_pendentes", groupId: "materiais", label: "Mat. pendentes", minPx: 60, weight: 0.07 },
  { id: "fp_mat_validados", groupId: "materiais", label: "Mat. validados", minPx: 60, weight: 0.07 },

  // ── Histórico ─────────────────────────────────────────────────────
  { id: "fp_hist_prior_service", groupId: "historico", label: "Já foi militar?", minPx: 56, weight: 0.07 },
  { id: "fp_hist_prior_branch", groupId: "historico", label: "Força anterior", minPx: 90, weight: 0.1 },
  { id: "fp_hist_prior_inst", groupId: "historico", label: "Instituição anterior", minPx: 110, weight: 0.13 },
  { id: "fp_hist_prior_rank", groupId: "historico", label: "Posto anterior", minPx: 80, weight: 0.09 },
  { id: "fp_hist_prior_duration", groupId: "historico", label: "Tempo de serv.", minPx: 70, weight: 0.08 },
  { id: "fp_hist_religion", groupId: "historico", label: "Religião", minPx: 80, weight: 0.09 },
  { id: "fp_hist_religious_restr", groupId: "historico", label: "Restr. religiosa?", minPx: 56, weight: 0.07 },
];

// Index para lookup O(1) por id
export const FICHA_FIELDS_BY_ID: Record<string, FichaField> = Object.fromEntries(
  FICHA_FIELDS.map((f) => [f.id, f]),
);

// =====================================================================
// Presets
// =====================================================================

export interface FichaPreset {
  id: string;
  label: string;
  description: string;
  fieldIds: string[];
}

export const FICHA_PRESETS: FichaPreset[] = [
  {
    id: "basicos",
    label: "Dados básicos",
    description: "Identificação rápida + telefones — útil para chamada.",
    fieldIds: [
      "fp_resumo_numero",
      "fp_resumo_war_name",
      "fp_resumo_pelotao",
      "fp_id_full_name",
      "fp_id_cpf",
      "fp_id_sex",
      "fp_contato_whatsapp",
      "fp_resumo_enrollment",
    ],
  },
  {
    id: "contato-emergencia",
    label: "Contato e emergência",
    description: "Telefones do aluno e contatos prioritários.",
    fieldIds: [
      "fp_resumo_numero",
      "fp_resumo_war_name",
      "fp_contato_whatsapp",
      "fp_contato_email",
      "fp_em_c1_nome",
      "fp_em_c1_parent",
      "fp_em_c1_tel",
      "fp_em_c2_nome",
      "fp_em_c2_tel",
    ],
  },
  {
    id: "saude",
    label: "Saúde",
    description: "Restrições de saúde (LGPD).",
    fieldIds: [
      "fp_resumo_numero",
      "fp_resumo_war_name",
      "fp_sa_blood",
      "fp_sa_alergias",
      "fp_sa_medicacao",
      "fp_sa_doenca",
      "fp_sa_resumo",
      "fp_sa_validacao",
    ],
  },
  {
    id: "logistica-materiais",
    label: "Logística e materiais",
    description: "Moradia, veículo, situação de materiais.",
    fieldIds: [
      "fp_resumo_numero",
      "fp_resumo_war_name",
      "fp_log_residencia_macapa",
      "fp_log_needs_housing",
      "fp_log_gandola",
      "fp_log_calca",
      "fp_vei_has_vehicle",
      "fp_vei_has_cnh",
      "fp_vei_cnh_cat",
      "fp_mat_pendentes",
      "fp_mat_validados",
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    description: "Resumo do estado dos documentos.",
    fieldIds: [
      "fp_resumo_numero",
      "fp_resumo_war_name",
      "fp_resumo_pelotao",
      "fp_resumo_enrollment",
      "fp_doc_enviados",
      "fp_doc_pendentes",
      "fp_doc_rejeitados",
    ],
  },
];

// =====================================================================
// Limites para análise da seleção
// =====================================================================
//
// Página A4 paisagem: 842pt × 595pt
// Margens laterais:   32pt + 32pt = 64pt
// Largura útil ≈ 778pt
//
// IDEAL  : até 85% da largura útil  → folga visual, ótima legibilidade
// LIMITE :   85%–100%               → ainda imprime bem, mas apertado
// EXCESSO: acima de 100%            → colunas mínimas espremidas → bloqueia
// =====================================================================

export const FICHA_USABLE_PX = 778;
export const FICHA_THRESHOLD_IDEAL_PX = Math.round(FICHA_USABLE_PX * 0.85); // ≈ 661
export const FICHA_THRESHOLD_LIMITE_PX = FICHA_USABLE_PX;

export type SelectionStatus = "vazio" | "ideal" | "limite" | "excesso";

export interface SelectionEvaluation {
  status: SelectionStatus;
  totalMinPx: number;
  thresholdIdealPx: number;
  thresholdLimitePx: number;
  usablePx: number;
  count: number;
  fields: FichaField[];
  /** % de aproveitamento da largura útil (0–100+) */
  occupancyPct: number;
  /** Sugestão textual exibida no modal */
  message: string;
}

export function evaluateSelection(selectedIds: string[]): SelectionEvaluation {
  const fields = selectedIds
    .map((id) => FICHA_FIELDS_BY_ID[id])
    .filter((f): f is FichaField => Boolean(f));
  const totalMinPx = fields.reduce((sum, f) => sum + f.minPx, 0);
  const occupancyPct = Math.round((totalMinPx / FICHA_USABLE_PX) * 100);

  let status: SelectionStatus;
  let message: string;
  if (fields.length === 0) {
    status = "vazio";
    message = "Selecione ao menos um campo para gerar o PDF.";
  } else if (totalMinPx <= FICHA_THRESHOLD_IDEAL_PX) {
    status = "ideal";
    message = "Ideal para A4 paisagem — boa legibilidade.";
  } else if (totalMinPx <= FICHA_THRESHOLD_LIMITE_PX) {
    status = "limite";
    message =
      "No limite para A4 paisagem. O PDF ainda imprime bem, mas as colunas " +
      "ficarão apertadas. Considere remover 1–2 campos.";
  } else {
    status = "excesso";
    message =
      "A quantidade de campos selecionados pode prejudicar a formatação do " +
      "PDF em A4 paisagem. Reduza a seleção ou gere o relatório em mais de uma seção " +
      "(use os presets por aba).";
  }

  return {
    status,
    totalMinPx,
    thresholdIdealPx: FICHA_THRESHOLD_IDEAL_PX,
    thresholdLimitePx: FICHA_THRESHOLD_LIMITE_PX,
    usablePx: FICHA_USABLE_PX,
    count: fields.length,
    fields,
    occupancyPct,
    message,
  };
}
