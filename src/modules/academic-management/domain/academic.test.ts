import { describe, expect, it } from "vitest";
import {
  calculateAcademicResult,
  DEFAULT_POLICY_PARAMETERS,
  roundHalfEven,
  validatePolicyParameters,
  type AcademicInput,
  type PolicyParameters,
} from "./academic";
import { ACADEMIC_CATALOG, vcCountEvidence } from "./catalog";
const policy = (changes: Partial<PolicyParameters> = {}): PolicyParameters => ({
  ...DEFAULT_POLICY_PARAMETERS,
  // Baseline de contraste mantém a alternativa PPC/RI testada separadamente.
  vfMinAverage: 5,
  attendanceMode: "total",
  absencePenaltyStage: "before_vf",
  ...changes,
});
const input = (changes: Partial<AcademicInput> = {}): AcademicInput => ({
  kind: "disciplina",
  workloadHours: 40,
  vcCount: 2,
  policy: policy(),
  vcScores: [7, 7],
  vfScore: null,
  justifiedAbsences: 0,
  unjustifiedAbsences: 0,
  ...changes,
});

describe("explicit policy and decimal arithmetic", () => {
  it("usa a interpretação provisória do RI revisado de 2026", () => {
    expect(DEFAULT_POLICY_PARAMETERS).toMatchObject({
      version: 2,
      directPassGrade: 7,
      vfMinAverage: 5,
      vfPassGrade: 5,
      attendanceMode: "unjustified",
      absencePenaltyStage: "none",
      comparisonStage: "rounded",
      averageDecimals: 2,
    });
  });
  it("não desconta faltas da nota na política RI 2026", () => {
    const result = calculateAcademicResult(
      input({
        policy: { ...DEFAULT_POLICY_PARAMETERS },
        vcScores: [7, 7],
        justifiedAbsences: 0,
        unjustifiedAbsences: 2,
      }),
    );
    expect(result.status).toBe("approved");
    expect(result.finalGrade).toBe(7);
    expect(result.absencePenalty).toBe(0);
  });
  it("requires an explicit choice of exact or rounded comparisons", () => {
    expect(validatePolicyParameters({ ...policy(), comparisonStage: undefined })).toBe(false);
    expect(validatePolicyParameters({ ...policy(), comparisonStage: "approximate" })).toBe(false);
  });
  it("keeps an exact 6.995 MVC below the direct-pass cutoff despite its displayed 7.00", () => {
    const exact = calculateAcademicResult(
      input({ vcScores: [7, 6.99], policy: policy({ comparisonStage: "exact" }) }),
    );
    expect(exact.status).toBe("pending_vf");
    expect(exact.mvc).toBe(7);
    expect(exact.reasons.join(" ")).toContain("valores exatos");
    expect(calculateAcademicResult(input({ vcScores: [7, 6.99] })).status).toBe("approved");
  });
  it("does not use a rounded 5.00 to approve an exact 4.995 VF average", () => {
    const exact = calculateAcademicResult(
      input({ vcScores: [6, 6], vfScore: 3.99, policy: policy({ comparisonStage: "exact" }) }),
    );
    expect(exact.status).toBe("failed");
    expect(exact.vfAverage).toBe(5);
    expect(exact.finalGrade).toBe(5);
    expect(exact.requiredVfForApproval).toBe(4);
    expect(calculateAcademicResult(input({ vcScores: [6, 6], vfScore: 3.99 })).status).toBe(
      "approved_vf",
    );
  });
  it("uses exact fractions for the effective VF target when selected", () => {
    const setup = input({
      vcScores: [6, 6],
      unjustifiedAbsences: 4,
      policy: policy({ comparisonStage: "exact", absencePenaltyStage: "after_vf" }),
    });
    expect(calculateAcademicResult(setup).requiredVfForApproval).toBe(8);
    expect(calculateAcademicResult({ ...setup, vfScore: 8 }).status).toBe("approved_vf");
    expect(calculateAcademicResult({ ...setup, vfScore: 7.99 }).status).toBe("failed");
  });
  it("does not apply form defaults to an unapproved offering", () => {
    const result = calculateAcademicResult(input({ policy: null, vcScores: [10, 10] }));
    expect(result.status).toBe("pending_policy");
    expect(result.finalGrade).toBeNull();
    expect(Object.isFrozen(DEFAULT_POLICY_PARAMETERS)).toBe(true);
  });
  it("requires all policy fields and validates their relationships", () => {
    expect(validatePolicyParameters(policy())).toBe(true);
    for (const p of [
      null,
      { version: 1 },
      { ...policy(), attendanceMode: undefined },
      { ...policy(), averageDecimals: 4 },
      { ...policy(), vfMinAverage: 7 },
      { ...policy(), vfMaxRecordedGrade: 4 },
      { ...policy(), maxVfDisciplines: 2.5 },
      { ...policy(), absenceLimitPercent: Infinity },
    ])
      expect(validatePolicyParameters(p)).toBe(false);
  });
  it.each([
    [6.985, 2, 6.98],
    [6.995, 2, 7],
    [2.675, 2, 2.68],
    [2.665, 2, 2.66],
    [2.66501, 2, 2.67],
    [6.9849, 2, 6.98],
    [-2.665, 2, -2.66],
    [1.2345, 3, 1.234],
    [1.2355, 3, 1.236],
    [1e-7, 7, 0.0000001],
    [5e-8, 7, 0],
  ])("rounds %s at %s places to %s with half-even", (value, places, expected) =>
    expect(roundHalfEven(value, places)).toBe(expected),
  );
  it("rejects invalid rounding arguments", () => {
    expect(() => roundHalfEven(NaN, 2)).toThrow(RangeError);
    expect(() => roundHalfEven(7, -1)).toThrow(RangeError);
    expect(() => roundHalfEven(7, 2.5)).toThrow(RangeError);
  });
  it("honors the precision explicitly selected before comparing averages", () => {
    expect(calculateAcademicResult(input({ vcScores: [7, 6.99] })).status).toBe("approved");
    expect(
      calculateAcademicResult(
        input({ vcScores: [7, 6.99], policy: policy({ averageDecimals: 3 }) }),
      ).status,
    ).toBe("pending_vf");
  });
});

describe("complete and valid academic inputs", () => {
  it("does not interpret sparse arrays as zero-valued grades", () => {
    const result = calculateAcademicResult(input({ vcScores: new Array<number>(2) }));
    expect(result.status).toBe("invalid_input");
    expect(result.finalGrade).toBeNull();
  });
  it("preserves zero and does not turn a missing grade into zero", () => {
    const zero = calculateAcademicResult(input({ vcScores: [0, 0] }));
    expect(zero.mvc).toBe(0);
    expect(zero.status).toBe("failed");
    const missing = calculateAcademicResult(input({ vcScores: [10, null] }));
    expect(missing.status).toBe("pending_grades");
    expect(missing.mvc).toBeNull();
    expect(calculateAcademicResult(input({ vcScores: [10] })).status).toBe("pending_grades");
    expect(calculateAcademicResult(input({ vcScores: [10, 10] })).finalGrade).toBe(10);
    expect(calculateAcademicResult(input()).status).toBe("approved");
  });
  it.each([
    { vcScores: [-0.01, 7] },
    { vcScores: [10.01, 7] },
    { vcScores: [NaN, 7] },
    { vcScores: [Infinity, 7] },
    { vcScores: [7, 7, 7] },
    { vfScore: Infinity },
    { workloadHours: 0 },
    { workloadHours: NaN },
    { vcCount: 0 },
    { vcCount: 1.5 },
    { justifiedAbsences: -1 },
    { unjustifiedAbsences: Infinity },
    { justifiedAbsences: 30, unjustifiedAbsences: 11 },
  ])("rejects malformed data %j", (changes) =>
    expect(calculateAcademicResult(input(changes)).status).toBe("invalid_input"),
  );
  it.each(["estagio", "atividade", "comportamento", "tcc"] as const)(
    "does not invent an ordinary VC grade for %s",
    (kind) => {
      const result = calculateAcademicResult(input({ kind, vcScores: [10, 10] }));
      expect(result.status).toBe("pending_special");
      expect(result.finalGrade).toBeNull();
      expect(result.vfRequired).toBe(false);
    },
  );
  it("leaves input data and policy untouched", () => {
    const data = input({ vcScores: [6, 6], vfScore: 8 });
    const before = JSON.stringify(data);
    calculateAcademicResult(data);
    expect(JSON.stringify(data)).toBe(before);
  });
});

describe("VF and reducer", () => {
  it("distinguishes NAVF from the actual score needed after terminal deductions", () => {
    const result = calculateAcademicResult(
      input({
        vcScores: [6, 6],
        unjustifiedAbsences: 4,
        policy: policy({ absencePenaltyStage: "after_vf", averageDecimals: 3 }),
      }),
    );
    expect(result.absencePenalty).toBe(1);
    expect(result.requiredVf).toBe(4);
    expect(result.requiredVfForApproval).toBe(8);
    expect(
      calculateAcademicResult(
        input({
          vcScores: [6, 6],
          vfScore: 4,
          unjustifiedAbsences: 4,
          policy: policy({ absencePenaltyStage: "after_vf", averageDecimals: 3 }),
        }),
      ).status,
    ).toBe("failed");
  });
  it("finds the minimum under the very same half-even stages as the actual VF", () => {
    const setup = input({
      vcScores: [6, 6],
      unjustifiedAbsences: 4,
      policy: policy({ absencePenaltyStage: "after_vf" }),
    });
    const target = calculateAcademicResult(setup);
    expect(target.requiredVfForApproval).toBe(7.98);
    expect(calculateAcademicResult({ ...setup, vfScore: 7.98 }).status).toBe("approved_vf");
    expect(calculateAcademicResult({ ...setup, vfScore: 7.97 }).status).toBe("failed");
    const noPenalty = calculateAcademicResult(input({ vcScores: [6, 6] }));
    expect(noPenalty.requiredVf).toBe(4);
    expect(noPenalty.requiredVfForApproval).toBe(3.99);
  });
  it("signals when no valid VF can overcome the terminal deduction", () => {
    const result = calculateAcademicResult(
      input({
        vcScores: [6, 6],
        unjustifiedAbsences: 8,
        policy: policy({ absencePenaltyStage: "after_vf" }),
      }),
    );
    expect(result.requiredVf).toBe(4);
    expect(result.requiredVfForApproval).toBeNull();
    expect(result.status).toBe("pending_review");
    expect(result.vfRequired).toBe(true);
    expect(result.reasons.join(" ")).toContain("Nenhuma nota de VF");
  });
  it("calculates required VF and keeps recovery distinct from direct approval", () => {
    const pending = calculateAcademicResult(input({ vcScores: [6, 6] }));
    expect(pending.status).toBe("pending_vf");
    expect(pending.requiredVf).toBe(4);
    expect(pending.vfRequired).toBe(true);
    const recovered = calculateAcademicResult(input({ vcScores: [6, 6], vfScore: 8 }));
    expect(recovered.vfAverage).toBe(7);
    expect(recovered.finalGrade).toBe(6);
    expect(recovered.status).toBe("approved_vf");
    expect(recovered.vfRequired).toBe(true);
  });
  it("passes at the exact minimum and fails below it", () => {
    expect(calculateAcademicResult(input({ vcScores: [6, 6], vfScore: 4 })).finalGrade).toBe(5);
    expect(calculateAcademicResult(input({ vcScores: [6, 6], vfScore: 3.98 })).status).toBe(
      "failed",
    );
  });
  it("makes the VF intermediate rounding decision observable", () => {
    expect(calculateAcademicResult(input({ vcScores: [6, 6], vfScore: 3.99 })).status).toBe(
      "approved_vf",
    );
    expect(
      calculateAcademicResult(
        input({ vcScores: [6, 6], vfScore: 3.99, policy: policy({ averageDecimals: 3 }) }),
      ).status,
    ).toBe("failed");
  });
  it("supports explicitly different VF minimums without choosing a norm", () => {
    expect(calculateAcademicResult(input({ vcScores: [4.99, 4.99] })).status).toBe("failed");
    expect(
      calculateAcademicResult(
        input({ vcScores: [4.99, 4.99], policy: policy({ vfMinAverage: 0 }) }),
      ).status,
    ).toBe("pending_vf");
    expect(calculateAcademicResult(input({ vcScores: [5, 5] })).status).toBe("pending_vf");
    expect(
      calculateAcademicResult(
        input({ vcScores: [0, 0], vfScore: 10, policy: policy({ vfMinAverage: 0 }) }),
      ).finalGrade,
    ).toBe(5);
  });
  it("does not apply a VF when the student is ineligible", () => {
    expect(calculateAcademicResult(input({ vcScores: [7, 7], vfScore: 10 })).status).toBe(
      "invalid_input",
    );
    expect(calculateAcademicResult(input({ vcScores: [4, 4], vfScore: 10 })).finalGrade).toBeNull();
  });
  it("respects the recorded recovery ceiling", () => {
    const result = calculateAcademicResult(input({ vcScores: [6.99, 6.99], vfScore: 10 }));
    expect(result.finalGrade).toBe(6.75);
    expect(result.status).toBe("approved_vf");
  });
});

describe("attendance and point deductions", () => {
  it("requires explicit absence counts, including zero", () => {
    const result = calculateAcademicResult(input({ unjustifiedAbsences: null }));
    expect(result.status).toBe("pending_attendance");
    expect(result.mvc).toBe(7);
    expect(result.finalGrade).toBeNull();
  });
  it("subtracts proportionate points, not a fraction of the grade", () => {
    const result = calculateAcademicResult(input({ vcScores: [8, 8], unjustifiedAbsences: 2 }));
    expect(result.absencePenalty).toBe(0.5);
    expect(result.mvc).toBe(7.5);
    expect(result.finalGrade).toBe(7.5);
  });
  it("does not deduct points for justified absences and uses the selected attendance basis", () => {
    const total = calculateAcademicResult(input({ justifiedAbsences: 11 }));
    expect(total.status).toBe("failed_attendance");
    expect(total.absencePenalty).toBe(0);
    const unjustified = calculateAcademicResult(
      input({ justifiedAbsences: 11, policy: policy({ attendanceMode: "unjustified" }) }),
    );
    expect(unjustified.attendancePercent).toBe(100);
    expect(unjustified.finalGrade).toBe(7);
  });
  it("accepts exactly 25 percent and compares excess before display rounding", () => {
    expect(
      calculateAcademicResult(input({ vcScores: [10, 10], unjustifiedAbsences: 10 })).status,
    ).toBe("approved");
    const excess = calculateAcademicResult(
      input({ vcScores: [10, 10], unjustifiedAbsences: 10.0001 }),
    );
    expect(excess.attendancePercent).toBe(75);
    expect(excess.status).toBe("failed_attendance");
  });
  it("honors the approved deduction stage and never deducts twice", () => {
    const before = calculateAcademicResult(input({ unjustifiedAbsences: 2 }));
    expect(before.mvc).toBe(6.5);
    expect(before.requiredVf).toBe(3.5);
    expect(before.status).toBe("pending_vf");
    const after = calculateAcademicResult(
      input({ unjustifiedAbsences: 2, policy: policy({ absencePenaltyStage: "after_vf" }) }),
    );
    expect(after.mvc).toBe(7);
    expect(after.finalGrade).toBe(6.5);
    expect(after.vfRequired).toBe(false);
    expect(after.status).toBe("failed");
    const recovered = calculateAcademicResult(
      input({
        vcScores: [6, 6],
        vfScore: 8,
        unjustifiedAbsences: 2,
        policy: policy({ absencePenaltyStage: "after_vf" }),
      }),
    );
    expect(recovered.vfAverage).toBe(7);
    expect(recovered.finalGrade).toBe(5.5);
  });
  it("does not silently invent a zero floor for negative terminal grades", () => {
    const result = calculateAcademicResult(input({ vcScores: [0, 0], unjustifiedAbsences: 1 }));
    expect(result.status).toBe("pending_review");
    expect(result.finalGrade).toBeNull();
  });
});

describe("source-grounded catalog", () => {
  it("contains 82 unique components and the exact matrix totals", () => {
    expect(ACADEMIC_CATALOG).toHaveLength(82);
    expect(new Set(ACADEMIC_CATALOG.map((item) => item.code)).size).toBe(82);
    for (const [phase, count, hours] of [
      [1, 26, 1594],
      [2, 32, 1750],
      [3, 24, 1580],
    ] as const) {
      const items = ACADEMIC_CATALOG.filter((item) => item.phase === phase);
      expect(items).toHaveLength(count);
      expect(items.reduce((sum, item) => sum + item.workloadHours, 0)).toBe(hours);
    }
    // TCC remains a curriculum discipline, with its own pending assessment criteria.
    expect(
      ACADEMIC_CATALOG.filter((item) => item.kind === "disciplina" || item.kind === "tcc"),
    ).toHaveLength(76);
    expect(ACADEMIC_CATALOG.find((item) => item.code === "CFO3-08")?.kind).toBe("tcc");
  });
  it("retains all five workload conflicts and the absent Ethics syllabus", () => {
    const conflicts = ACADEMIC_CATALOG.filter(
      (item) => item.syllabusHours !== null && item.workloadHours !== item.syllabusHours,
    );
    expect(conflicts.map((item) => [item.code, item.workloadHours, item.syllabusHours])).toEqual([
      ["CFO1-09", 30, 38],
      ["CFO1-21", 80, 40],
      ["CFO2-01", 30, 40],
      ["CFO2-12", 70, 80],
      ["CFO3-17", 40, 43],
    ]);
    expect(conflicts.every((item) => item.conflicts.length > 0)).toBe(true);
    expect(ACADEMIC_CATALOG.find((item) => item.code === "CFO1-03")?.syllabusHours).toBeNull();
  });
  it("preserves separate SCI and Gerenciamento entries and never invents behavior weights", () => {
    expect(ACADEMIC_CATALOG.find((item) => item.code === "CFO3-13")?.workloadHours).toBe(40);
    expect(ACADEMIC_CATALOG.find((item) => item.code === "CFO3-15")?.workloadHours).toBe(60);
    expect(ACADEMIC_CATALOG.some((item) => item.kind === "comportamento")).toBe(false);
    expect(Object.isFrozen(ACADEMIC_CATALOG)).toBe(true);
    expect(Object.isFrozen(ACADEMIC_CATALOG[0])).toBe(true);
  });
  it("reports conflicting VC counts and the RI gap instead of resolving them", () => {
    expect(vcCountEvidence(30)).toEqual({
      ppcMinimum: 1,
      regimentoRequired: 2,
      requiresDecision: true,
    });
    expect(vcCountEvidence(40)).toEqual({
      ppcMinimum: 2,
      regimentoRequired: 2,
      requiresDecision: false,
    });
    expect(vcCountEvidence(60)).toEqual({
      ppcMinimum: 2,
      regimentoRequired: null,
      requiresDecision: true,
    });
    expect(vcCountEvidence(80)).toEqual({
      ppcMinimum: 3,
      regimentoRequired: 3,
      requiresDecision: false,
    });
  });
});
