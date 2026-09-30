import { formatMinutes } from "@/modules/internship-management/domain/workload";
import { internshipUniformLabel } from "@/modules/internship-management/domain/uniforms";
import { formatReportDate, formatReportDateTime } from "./internship-report-data";
import { type OperationalInternshipScale } from "./internship-operational-scale";
import { __internals } from "./pdf-builders";
import { beachUnits, beachFooterLines } from "./internship-beach-guidance";

// Portaria nº 549, de 28/07/2026, art. 1º (coordenação do CFO BM 2026, 1º ano).
const signatories = {
  supervisor: {
    name: "CAP QOEM BM FRANCIELTON ARAÚJO AMADOR",
    role: "Supervisor do CFO",
  },
  coordenador: {
    name: "MAJ QOEM BM MÁRCIO FONSECA DA COSTA",
    role: "Coordenador do CFO",
  },
};
export type InternshipScaleSignatory = keyof typeof signatories;

export function formatShiftDuration(startsAt: string, endsAt: string): string {
  const minutes = Math.max(0, Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

export async function buildOperationalInternshipPDF(
  scale: OperationalInternshipScale,
  signatory: InternshipScaleSignatory = "coordenador",
): Promise<Buffer> {
  const headerUnit =
    scale.gbmName ??
    {
      gbm: "GBMs",
      praia: "GUARDA-VIDAS",
      permanencia: "DIA AO 1º ANO · ABM",
      todos: "CFO1",
      estagio: "CFO1",
    }[scale.service];
  const opts = {
    title: scale.title ?? "ESCALA DE ESTÁGIO SUPERVISIONADO CFO1",
    subtitle: `Escala nº ${scale.referenceCode} - ${formatReportDate(scale.periodStart)} a ${formatReportDate(scale.periodEnd)} - emitida em ${formatReportDateTime(scale.issuedAt)}`,
    // Só a retificação de escala já divulgada é marcada; emissão e correção prévia saem limpas.
    revisionNote: scale.rectification
      ? `RETIFICAÇÃO ${String(scale.rectification).padStart(2, "0")} - ${scale.changeSummary ?? ""}`
      : undefined,
    institutionalInternshipHeader: true,
    headerUnit,
    signatureBlock: signatories[signatory],
    compactFooter:
      scale.service === "praia"
        ? {
            title:
              "OBSERVAÇÕES IMPORTANTES - síntese do Manual do Cadete de 27/09/2026 (Plano nº 2026.0061)",
            lines: beachFooterLines(scale.rows),
          }
        : undefined,
    footerNote: ["permanencia", "todos"].includes(scale.service)
      ? "O serviço do Dia ao 1º Ano não integra a carga curricular do estágio; as horas homologadas exibidas referem-se apenas ao estágio."
      : undefined,
  };
  const doc = __internals.createDoc(opts.revisionNote ? 190 : 176);
  if (!scale.rows.length) {
    __internals.renderTable(
      doc,
      opts,
      ["Situação"],
      [
        [
          `SEM PARTICIPAÇÕES VIGENTES NESTE PERÍODO. ${scale.rectification ? "Esta retificação substitui as emissões anteriores." : "Esta versão substitui a emissão anterior."}`,
        ],
      ],
      [1],
    );
    return __internals.overlayReportChrome(await __internals.pdfToBuffer(doc), opts);
  }
  if (scale.service === "praia") {
    __internals.renderTable(
      doc,
      opts,
      [
        "Cadete",
        "Praia",
        "Unidade responsável",
        "Apresentação",
        "Início",
        "Término",
        "Duração",
        "Uniforme",
        "Estágio homologado",
      ],
      scale.rows.map((row) => {
        const beach = beachUnits(row.siteName);
        return [
          row.warName,
          beach.name,
          beach.responsible,
          beach.presentation,
          formatReportDateTime(row.startsAt),
          formatReportDateTime(row.endsAt),
          formatShiftDuration(row.startsAt, row.endsAt),
          row.uniformCode.replace(/^(\d)([A-Z])$/, "$1º $2"),
          formatMinutes(row.validatedMinutes),
        ];
      }),
      [0.105, 0.1, 0.16, 0.155, 0.105, 0.105, 0.07, 0.065, 0.135],
    );
    return __internals.overlayReportChrome(await __internals.pdfToBuffer(doc), opts);
  }
  __internals.renderTable(
    doc,
    opts,
    [
      "Cadete",
      "Serviço",
      "Local / recurso",
      "Início",
      "Término",
      "Duração",
      "Uniforme",
      "Estágio homologado",
    ],
    scale.rows.map((row) => [
      row.warName,
      row.activityName,
      `${row.siteName}\n${row.resourceName}`,
      formatReportDateTime(row.startsAt),
      formatReportDateTime(row.endsAt),
      formatShiftDuration(row.startsAt, row.endsAt),
      internshipUniformLabel(row.uniformCode),
      formatMinutes(row.validatedMinutes),
    ]),
    [0.12, 0.09, 0.14, 0.13, 0.13, 0.075, 0.18, 0.135],
  );
  return __internals.overlayReportChrome(await __internals.pdfToBuffer(doc), opts);
}
