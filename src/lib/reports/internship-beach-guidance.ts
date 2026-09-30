import type { OperationalInternshipRow } from "./internship-operational-scale";

// Manual do Cadete - Prevenção Aquática, 27/09/2026, Plano nº 2026.0061.
// Coordenação confirmou que Santa Inês identifica o ponto Perpétuo Socorro.
const normalize = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
const units: Record<string, { name: string; responsible: string; presentation: string }> = {
  fazendinha: {
    name: "Fazendinha",
    responsible: "GMAF e 5º GBM",
    presentation: "GMAF ou 5º GBM\n(supervisor define)",
  },
  "perpetuo socorro": {
    name: "Perpétuo Socorro",
    responsible: "SEC GAB (Gabinete)\ne 3º GBM",
    presentation: "1º GBM (Gabinete)\nou 3º GBM\n(supervisor define)",
  },
  araxa: { name: "Araxá", responsible: "1º GBM", presentation: "1º GBM" },
  "cidade nova": { name: "Cidade Nova", responsible: "SEC GAB (Gabinete)", presentation: "1º GBM" },
  curiau: { name: "Curiaú", responsible: "2º GBM", presentation: "2º GBM" },
};

export function beachUnits(siteName: string) {
  const key = normalize(siteName);
  return (
    units[key === "santa ines" ? "perpetuo socorro" : key] ?? {
      name: siteName,
      responsible: "A confirmar",
      presentation: "Confirmar com supervisor",
    }
  );
}

export function beachFooterLines(rows: OperationalInternshipRow[]): string[] {
  // The manual's dated officer and times must not leak into other operations.
  const manualOperation =
    rows.length > 0 &&
    rows.every(
      (row) =>
        Date.parse(row.startsAt) === Date.parse("2026-09-27T10:00:00-03:00") &&
        Date.parse(row.endsAt) === Date.parse("2026-09-27T18:00:00-03:00"),
    );
  return [
    manualOperation
      ? "Apresentação: 9h30 na unidade indicada; no ponto às 9h45; prevenção 10h-18h. CPA em 27/09/2026: Tenente Dorival."
      : "Apresentação: confirme horário e CPA do dia com o supervisor; apresente-se na unidade indicada antes de seguir à praia.",
    "Destino: em Fazendinha e Perpétuo Socorro, o supervisor define a unidade. GMAF: Rua Vila Operária, 444; 5º GBM: Santana.",
    "Antes: respeite o descanso; avise imprevistos antes da apresentação; confira material/avarias, teste o HT e salve o contato do CPA.",
    "Durante: uniforme completo; vigilância contínua, orientação ao público e sinalização de riscos; avise ativação/desativação ao CPA.",
    "Ocorrências: preste atendimento e comunique ao CPA; apoio via CPA. Registre horário, local, fatos e providências; falha do HT: telefone.",
    "Após: confira e devolva material/viatura higienizada à OBM de origem; registre danos e repasse as ocorrências ao CPA.",
  ];
}
