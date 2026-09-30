export const internshipUniforms = [
  { code: "3A", label: "3º A — Operacional / Prontidão" },
  { code: "2C", label: "2º C — Passeio / Representação" },
  { code: "4A", label: "4º A — Educação Física" },
  { code: "4D", label: "4º D — Operações Aquáticas / Serviço de Guarda-Vidas" },
] as const;
export type InternshipUniformCode = (typeof internshipUniforms)[number]["code"];
export function defaultInternshipUniform(activityCode: string): InternshipUniformCode {
  return activityCode === "guarda_vida" ? "4D" : "3A";
}
export function internshipUniformLabel(code: string) {
  return internshipUniforms.find((uniform) => uniform.code === code)?.label ?? code;
}
