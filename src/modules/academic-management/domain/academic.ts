/** Versioned calculation contract. A proposal is never an approved policy. */
export interface PolicyParameters {
  version: 1 | 2;
  directPassGrade: number;
  vfMinAverage: number;
  vfPassGrade: number;
  vfReduction: boolean;
  vfMaxRecordedGrade: number;
  maxVfDisciplines: number;
  absenceLimitPercent: number;
  attendanceMode: "total" | "unjustified";
  absencePenaltyStage: "none" | "before_vf" | "after_vf";
  averageDecimals: 2 | 3 | 7;
  roundingMode: "half_even";
  comparisonStage: "rounded" | "exact";
  courseAttendanceMinimum: number;
}

export type AcademicKind = "disciplina" | "estagio" | "atividade" | "comportamento" | "tcc";
export interface AcademicInput {
  kind: AcademicKind;
  workloadHours: number;
  vcCount: number;
  policy: PolicyParameters | null;
  vcScores: (number | null)[];
  vfScore: number | null;
  justifiedAbsences: number | null;
  unjustifiedAbsences: number | null;
}
export interface AcademicResult {
  status: string;
  label: string;
  mvc: number | null;
  /** NAVF reference before terminal deduction; it may not suffice for approval. */
  requiredVf: number | null;
  /** Lowest centesimal VF that actually passes under all configured calculations. */
  requiredVfForApproval: number | null;
  vfAverage: number | null;
  finalGrade: number | null;
  attendancePercent: number | null;
  vfRequired: boolean;
  reasons: string[];
  /** Academic result only: no course classification or administrative exclusion. */
  unadjustedMvc: number | null;
  absencePenalty: number | null;
}

/** Provisional RI ABM 2026 preset. Each offering stores its own immutable copy. */
export const DEFAULT_POLICY_PARAMETERS: Readonly<PolicyParameters> = Object.freeze({
  version: 2,
  directPassGrade: 7,
  // O RI revisado de 2026, art. 38, exige MVC entre 5 e 7 para acesso à VF.
  vfMinAverage: 5,
  vfPassGrade: 5,
  vfReduction: true,
  vfMaxRecordedGrade: 6.75,
  maxVfDisciplines: 3,
  absenceLimitPercent: 25,
  // O RI revisado, art. 46, reprova por excesso de faltas sem descontá-las da nota.
  attendanceMode: "unjustified",
  absencePenaltyStage: "none",
  averageDecimals: 2,
  roundingMode: "half_even",
  comparisonStage: "rounded",
  courseAttendanceMinimum: 90,
});

const finiteInRange = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;

export function validatePolicyParameters(input: unknown): input is PolicyParameters {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const p = input as Record<string, unknown>;
  return (
    (p.version === 1 || p.version === 2) &&
    finiteInRange(p.directPassGrade, Number.MIN_VALUE, 10) &&
    finiteInRange(p.vfMinAverage, 0, 10) &&
    p.vfMinAverage < p.directPassGrade &&
    finiteInRange(p.vfPassGrade, Number.MIN_VALUE, 10) &&
    typeof p.vfReduction === "boolean" &&
    finiteInRange(p.vfMaxRecordedGrade, p.vfPassGrade, 10) &&
    finiteInRange(p.maxVfDisciplines, 0, Number.MAX_SAFE_INTEGER) &&
    Number.isInteger(p.maxVfDisciplines) &&
    finiteInRange(p.absenceLimitPercent, 0, 100) &&
    (p.attendanceMode === "total" || p.attendanceMode === "unjustified") &&
    (p.absencePenaltyStage === "none" ||
      p.absencePenaltyStage === "before_vf" ||
      p.absencePenaltyStage === "after_vf") &&
    (p.averageDecimals === 2 || p.averageDecimals === 3 || p.averageDecimals === 7) &&
    p.roundingMode === "half_even" &&
    (p.comparisonStage === "rounded" || p.comparisonStage === "exact") &&
    finiteInRange(p.courseAttendanceMinimum, 0, 100)
  );
}

/** Rational decimal arithmetic avoids binary floating-point ties such as 6.995. */
interface Fraction {
  n: bigint;
  d: bigint;
}
const whole = (value: number): Fraction => ({ n: BigInt(value), d: 1n });
function decimal(value: number): Fraction {
  const [mantissa = "0", exponentText = "0"] = value.toString().toLowerCase().split("e");
  const [integer = "0", fractional = ""] = mantissa.split(".");
  const digits = BigInt(integer + fractional);
  const scale = fractional.length - Number(exponentText);
  return scale >= 0
    ? { n: digits, d: 10n ** BigInt(scale) }
    : { n: digits * 10n ** BigInt(-scale), d: 1n };
}
const add = (a: Fraction, b: Fraction): Fraction => ({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
const subtract = (a: Fraction, b: Fraction): Fraction => ({
  n: a.n * b.d - b.n * a.d,
  d: a.d * b.d,
});
const multiply = (a: Fraction, b: Fraction): Fraction => ({ n: a.n * b.n, d: a.d * b.d });
const divide = (a: Fraction, b: Fraction): Fraction => ({ n: a.n * b.d, d: a.d * b.n });
const compare = (a: Fraction, b: Fraction): number =>
  a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0;
const numeric = (a: Fraction): number => Number(a.n) / Number(a.d);
function rounded(a: Fraction, places: number): Fraction {
  const scale = 10n ** BigInt(places);
  const sign = a.n < 0n ? -1n : 1n;
  const scaled = (a.n < 0n ? -a.n : a.n) * scale;
  const quotient = scaled / a.d;
  const twiceRemainder = (scaled % a.d) * 2n;
  const increase = twiceRemainder > a.d || (twiceRemainder === a.d && quotient % 2n !== 0n);
  return { n: sign * (quotient + (increase ? 1n : 0n)), d: scale };
}

export function roundHalfEven(value: number, places: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(places) || places < 0 || places > 7) {
    throw new RangeError("Informe número finito e precisão inteira entre 0 e 7.");
  }
  return numeric(rounded(decimal(value), places));
}

const baseResult = (): AcademicResult => ({
  status: "pending_policy",
  label: "Pendente de decisão normativa",
  mvc: null,
  requiredVf: null,
  requiredVfForApproval: null,
  vfAverage: null,
  finalGrade: null,
  attendancePercent: null,
  vfRequired: false,
  reasons: [],
  unadjustedMvc: null,
  absencePenalty: null,
});

/**
 * Versioned semantics (must be included in the approving decision):
 * - Scores are normalized to two decimals with half-even. comparisonStage=rounded
 *   rounds averages and adjusted results BEFORE comparison; exact keeps fractions
 *   until the status is decided, rounding only display and recorded grade values.
 * - none applies no grade deduction; before_vf and after_vf preserve the former RI
 *   interpretation for historical policies.
 * - Attendance mode selects counted absences for the discipline threshold only.
 *   Course-wide attendance and the course-wide VF limit need all enrollments.
 * - Policy null never falls back to DEFAULT_POLICY_PARAMETERS.
 */
export function calculateAcademicResult(input: AcademicInput): AcademicResult {
  const result = baseResult();
  let exactComparisonNotice: string | null = null;
  const finish = (status: string, label: string, ...reasons: string[]): AcademicResult => ({
    ...result,
    status,
    label,
    reasons: exactComparisonNotice ? [...reasons, exactComparisonNotice] : reasons,
  });
  if (!["disciplina", "estagio", "atividade", "comportamento", "tcc"].includes(input.kind)) {
    return finish("invalid_input", "Dados inválidos", "Tipo de componente curricular inválido.");
  }
  if (!finiteInRange(input.workloadHours, Number.MIN_VALUE, Number.MAX_SAFE_INTEGER)) {
    return finish(
      "invalid_input",
      "Dados inválidos",
      "A carga horária deve ser finita e maior que zero.",
    );
  }
  if (!Number.isSafeInteger(input.vcCount) || input.vcCount < 1) {
    return finish(
      "invalid_input",
      "Dados inválidos",
      "A quantidade de VCs deve ser um inteiro positivo.",
    );
  }
  if (
    !Array.isArray(input.vcScores) ||
    input.vcScores.length > input.vcCount ||
    Array.from(input.vcScores).some((score) => score !== null && !finiteInRange(score, 0, 10)) ||
    (input.vfScore !== null && !finiteInRange(input.vfScore, 0, 10))
  ) {
    return finish(
      "invalid_input",
      "Dados inválidos",
      "Informe notas entre 0 e 10, sem exceder a quantidade de VCs da oferta.",
    );
  }
  if (
    [input.justifiedAbsences, input.unjustifiedAbsences].some(
      (count) => count !== null && !finiteInRange(count, 0, input.workloadHours),
    )
  ) {
    return finish(
      "invalid_input",
      "Dados inválidos",
      "Faltas devem ser finitas, não negativas e não exceder a carga horária.",
    );
  }
  if (
    input.justifiedAbsences !== null &&
    input.unjustifiedAbsences !== null &&
    compare(
      add(decimal(input.justifiedAbsences), decimal(input.unjustifiedAbsences)),
      decimal(input.workloadHours),
    ) > 0
  ) {
    return finish(
      "invalid_input",
      "Dados inválidos",
      "A soma das faltas excede a carga horária da disciplina.",
    );
  }
  if (input.kind !== "disciplina") {
    return finish(
      "pending_special",
      "Regra específica pendente",
      "Estágio, atividades, TCC e comportamento exigem critérios próprios; não são calculados como VCs comuns.",
    );
  }
  if (input.policy === null) {
    return finish(
      "pending_policy",
      "Pendente de decisão normativa",
      "A oferta precisa de política aprovada e resolução dos conflitos aplicáveis.",
    );
  }
  if (!validatePolicyParameters(input.policy)) {
    return finish(
      "invalid_input",
      "Política inválida",
      "Todos os parâmetros da política devem ser explícitos e válidos.",
    );
  }
  const p = input.policy;
  const round = (value: Fraction): Fraction =>
    p.comparisonStage === "rounded" ? rounded(value, p.averageDecimals) : value;
  const display = (value: Fraction): number => numeric(rounded(value, p.averageDecimals));
  if (p.comparisonStage === "exact") {
    exactComparisonNotice =
      "Os cortes foram comparados com valores exatos. Os valores exibidos e a nota registrada são arredondados depois da decisão e podem coincidir visualmente com o corte sem alterar a situação calculada.";
  }
  const workload = decimal(input.workloadHours);
  const attendanceKnown = input.justifiedAbsences !== null && input.unjustifiedAbsences !== null;
  let penalty: Fraction | null = null;
  let absentPercent: Fraction | null = null;
  if (attendanceKnown) {
    const justified = decimal(input.justifiedAbsences as number);
    const unjustified = decimal(input.unjustifiedAbsences as number);
    const countedAbsences =
      p.attendanceMode === "total" ? add(justified, unjustified) : unjustified;
    absentPercent = multiply(divide(countedAbsences, workload), whole(100));
    result.attendancePercent = numeric(rounded(subtract(whole(100), absentPercent), 2));
    penalty =
      p.absencePenaltyStage === "none"
        ? whole(0)
        : multiply(divide(unjustified, workload), whole(10));
    result.absencePenalty = display(penalty);
  }
  if (input.vcScores.length !== input.vcCount || input.vcScores.some((score) => score === null)) {
    return finish(
      "pending_grades",
      "Notas pendentes",
      "Preencha todas as VCs; uma nota não lançada não equivale a zero.",
    );
  }
  const scores = input.vcScores as number[];
  const total = scores.reduce((sum, score) => add(sum, rounded(decimal(score), 2)), whole(0));
  const unadjustedMvc = round(divide(total, whole(input.vcCount)));
  result.unadjustedMvc = display(unadjustedMvc);
  result.mvc = result.unadjustedMvc;
  if (!attendanceKnown || penalty === null || absentPercent === null) {
    return finish(
      "pending_attendance",
      "Frequência pendente",
      "Informe faltas justificadas e injustificadas, inclusive zero quando confirmado.",
    );
  }
  const mvc =
    p.absencePenaltyStage === "before_vf" ? round(subtract(unadjustedMvc, penalty)) : unadjustedMvc;
  result.mvc = display(mvc);
  if (compare(absentPercent, decimal(p.absenceLimitPercent)) > 0) {
    return finish(
      "failed_attendance",
      "Limite de faltas excedido",
      "O limite da disciplina foi ultrapassado segundo a base de frequência aprovada; requer análise da coordenação.",
    );
  }
  const direct = compare(mvc, decimal(p.directPassGrade)) >= 0;
  const eligible = !direct && compare(mvc, decimal(p.vfMinAverage)) >= 0;
  if (input.vfScore !== null && !eligible) {
    return finish(
      "invalid_input",
      "VF sem elegibilidade",
      "Há nota de VF em uma situação que não permite VF pela política desta oferta.",
    );
  }
  const terminalGrade = (grade: Fraction): Fraction =>
    round(p.absencePenaltyStage === "after_vf" ? subtract(grade, penalty) : grade);
  const recordGrade = (grade: Fraction): boolean => {
    if (compare(grade, whole(0)) < 0 || compare(grade, whole(10)) > 0) return false;
    result.finalGrade = display(grade);
    return true;
  };
  const outsideScale = () =>
    finish(
      "pending_review",
      "Resultado exige análise",
      "O desconto produz nota fora da escala 0–10. Não foi aplicado piso ou teto sem previsão específica.",
    );
  if (direct) {
    const final = terminalGrade(mvc);
    if (!recordGrade(final)) return outsideScale();
    return compare(final, decimal(p.directPassGrade)) >= 0
      ? finish(
          "approved",
          "Aprovação direta na disciplina",
          "Resultado calculado com a política aprovada; conclusão do curso depende dos demais requisitos.",
        )
      : finish(
          "failed",
          "Nota final insuficiente",
          "O desconto após o cálculo reduziu a nota final abaixo do mínimo de aprovação direta.",
        );
  }
  if (!eligible) {
    if (!recordGrade(terminalGrade(mvc))) return outsideScale();
    return finish(
      "failed",
      "Média abaixo do acesso à VF",
      "A média não alcança o piso de acesso à VF definido pela política aprovada.",
    );
  }
  result.vfRequired = true;
  const needed = subtract(multiply(decimal(p.vfPassGrade), whole(2)), mvc);
  result.requiredVf = display(needed);
  // Reuse exactly this evaluation for both the actual score and the target search.
  // All operations are monotone, including half-even rounding and the cap.
  const evaluateVf = (score: number) => {
    const average = round(divide(add(mvc, rounded(decimal(score), 2)), whole(2)));
    const averagePasses = compare(average, decimal(p.vfPassGrade)) >= 0;
    let recovered = average;
    if (averagePasses) {
      recovered = p.vfReduction
        ? round(
            add(
              divide(subtract(average, decimal(p.vfPassGrade)), whole(2)),
              decimal(p.vfPassGrade),
            ),
          )
        : average;
      if (compare(recovered, decimal(p.vfMaxRecordedGrade)) > 0)
        recovered = decimal(p.vfMaxRecordedGrade);
    }
    const final = terminalGrade(recovered);
    const approved =
      averagePasses &&
      compare(final, decimal(p.vfPassGrade)) >= 0 &&
      compare(final, whole(10)) <= 0;
    return { average, averagePasses, final, approved };
  };
  const approvalAttainable = evaluateVf(10).approved;
  if (approvalAttainable) {
    let lower = 0;
    let upper = 1000;
    while (lower < upper) {
      const middle = Math.floor((lower + upper) / 2);
      if (evaluateVf(middle / 100).approved) upper = middle;
      else lower = middle + 1;
    }
    result.requiredVfForApproval = lower / 100;
  }
  const impossibleReasons = approvalAttainable
    ? []
    : [
        "Nenhuma nota de VF entre 0 e 10 permite aprovação com os descontos, redutor e precisão desta política. A coordenação deve analisar a situação.",
      ];
  if (input.vfScore === null) {
    if (!approvalAttainable)
      return finish("pending_review", "VF exige análise da coordenação", ...impossibleReasons);
    return finish(
      "pending_vf",
      "Aguardando VF",
      "Elegível à VF nesta disciplina; o limite de disciplinas em VF deve ser verificado no curso completo.",
    );
  }
  const evaluated = evaluateVf(input.vfScore);
  result.vfAverage = display(evaluated.average);
  if (!recordGrade(evaluated.final)) return outsideScale();
  if (!evaluated.averagePasses) {
    return finish(
      "failed",
      "Nota insuficiente após VF",
      "A média de MVC e VF não atingiu o mínimo da política.",
      ...impossibleReasons,
    );
  }
  return evaluated.approved
    ? finish(
        "approved_vf",
        "Aprovado em recuperação final",
        "Aplicada a política de VF e desconto desta oferta; resultado distinto da aprovação direta.",
      )
    : finish(
        "failed",
        "Nota insuficiente após desconto",
        "O desconto aplicado após a VF reduziu a nota final abaixo do mínimo.",
        ...impossibleReasons,
      );
}
