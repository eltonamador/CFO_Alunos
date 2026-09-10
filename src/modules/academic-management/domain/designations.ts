import portaria550 from "./portaria-550-cfo1.json";

export interface DesignationReference {
  disciplineCode: string;
  sourceCode: string;
  disciplineName: string;
  workloadHours: number;
  designationsText: string;
  sourceRef: string;
}

/** Portaria executória do CFO I de 2026; o texto é preservado sem inferir titularidade. */
export const PORTARIA_550_CFO1_DESIGNATIONS: readonly DesignationReference[] =
  Object.freeze(portaria550);

export function designationReferenceFor(
  disciplineCode: string,
  academicYear: number,
): DesignationReference | undefined {
  if (academicYear !== 2026) return undefined;
  return PORTARIA_550_CFO1_DESIGNATIONS.find((item) => item.disciplineCode === disciplineCode);
}
