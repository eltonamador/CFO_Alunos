import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { Database } from "@/lib/supabase/types";
import { formatMinutes } from "@/modules/internship-management/domain/workload";
import {
  evaluationAnswers,
  evaluationCriteria,
  evaluationActivities,
  evaluationServiceCode,
  evaluationStatus,
  evaluationTechnicalCriteria,
} from "@/modules/internship-management/domain/evaluation";
import { evaluationDetailsSchema } from "@/modules/internship-management/domain/evaluationValidation";
import {
  formatReportDateTime,
  internshipStatusLabel,
  type InternshipReportData,
} from "./internship-report-data";
export type IndividualReport = InternshipReportData & {
  evaluations: Database["public"]["Tables"]["internship_evaluations"]["Row"][];
  issuedAt: string;
};
export function canIssueWorkloadTerm(data: IndividualReport) {
  return (
    data.workload.length === 1 &&
    data.workload[0]!.validated_minutes >= data.program.required_minutes
  );
}
function sections(data: IndividualReport, term: boolean) {
  const cadet = data.workload[0]!;
  const result: { title: string; lines: string[] }[] = [
    {
      title: `${String(cadet.student_number).padStart(2, "0")} - ${cadet.war_name}`,
      lines: [
        data.program.name,
        `Emitido em ${formatReportDateTime(data.issuedAt)}`,
        `Homologadas: ${formatMinutes(cadet.validated_minutes)} | Exigidas: ${formatMinutes(data.program.required_minutes)}`,
        `Restantes: ${formatMinutes(cadet.missing_required_minutes)} | Fichas pendentes: ${cadet.awaiting_homologation}`,
      ],
    },
  ];
  if (term) {
    result.push({
      title: "Cumprimento da carga horária",
      lines: [
        `Conforme os registros homologados no CFO Alunos na data desta emissão, o cadete acima identificado cumpriu ${formatMinutes(cadet.validated_minutes)} de estágio supervisionado, atingindo o mínimo de ${formatMinutes(data.program.required_minutes)} exigido no programa.`,
        `O serviço do Dia ao 1º Ano não integra este total. Este documento comprova a carga registrada; a certificação do curso e demais requisitos dependem da Coordenação.`,
        `Identificador do programa: ${data.program.id}`,
        `Identificador do cadete: ${cadet.student_id}`,
        `Conferência e assinatura da Coordenação: __________________________________`,
      ],
    });
    return result;
  }
  for (const row of data.schedule)
    result.push({
      title: `${row.activity_name} - ${row.site_name}`,
      lines: [
        `${formatReportDateTime(row.starts_at)} a ${formatReportDateTime(row.ends_at)}`,
        `${internshipStatusLabel(row)} | Previstas ${formatMinutes(row.planned_minutes)} | Realizadas ${row.performed_minutes === null ? "não registradas" : formatMinutes(row.performed_minutes)} | Homologadas ${row.approved_minutes === null ? "não homologadas" : formatMinutes(row.approved_minutes)}`,
        `Supervisor: ${row.supervisor_name || "não informado"} | Referência: ${row.document_reference || "não informada"}`,
        ...(row.movement_reason ? [`Movimentação: ${row.movement_reason}`] : []),
      ],
    });
  for (const e of data.evaluations) {
    const ratings = (e.ratings ?? {}) as Record<string, string>;
    const context = (e.context ?? {}) as Record<string, string>;
    const parsedDetails = evaluationDetailsSchema.safeParse(e.details);
    const details = parsedDetails.success ? parsedDetails.data : null;
    const technical = evaluationTechnicalCriteria[evaluationServiceCode(context.activity_name ?? "")];
    result.push({
      title: `Avaliação v${e.version} - ${evaluationStatus[e.status] ?? e.status}`,
      lines: [
        `Plantão: ${context.activity_name || "serviço"} - ${context.site_name || "local não informado"} | ${context.starts_at ? formatReportDateTime(context.starts_at) : e.assignment_id}`,
        `Oficial: ${e.evaluator_name || e.recipient_name || "não informado"} | Unidade: ${e.evaluator_unit || "não informada"}`,
        `Recebida: ${e.submitted_at ? formatReportDateTime(e.submitted_at) : "aguardando"} | Revisada: ${e.reviewed_at ? formatReportDateTime(e.reviewed_at) : "aguardando"}`,
        ...evaluationCriteria.map(
          (c) =>
            `${c.title}: ${evaluationAnswers.find((a) => a.value === ratings[c.key])?.label || "sem resposta"}`,
        ),
        ...(details ? [
          `Ocorrências acompanhadas: ${details.occurrenceCount} | Atividades: ${details.activities.map((value) => evaluationActivities.find((activity) => activity.value === value)?.label ?? value).join(", ") || "não informadas"}`,
          ...technical.map((criterion) => `${criterion.title}: ${evaluationAnswers.find((answer) => answer.value === details.technicalRatings[criterion.key])?.label ?? "sem resposta"}`),
          `Ponto positivo: ${details.positiveNote || "não registrado"}`,
          `Devolutiva ao cadete: ${details.feedbackGiven === "sim" ? "sim" : details.feedbackGiven === "nao" ? "não" : "não informada"}`,
        ] : []),
        `Orientações: ${e.guidance || "não registradas"}`,
        ...(e.incident
          ? [`Ocorrência para conferência administrativa: ${e.incident_note || "registrada"}`]
          : []),
        ...(e.review_note ? [`Revisão administrativa: ${e.review_note}`] : []),
      ],
    });
  }
  return result;
}
export async function buildIndividualPDF(data: IndividualReport, term = false): Promise<Buffer> {
  if (term && !canIssueWorkloadTerm(data)) throw new Error("Carga mínima ainda não atingida.");
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 55, left: 48, right: 48 },
    bufferPages: true,
    info: {
      Title: term ? "Termo de cumprimento de carga horária" : "Relatório individual de estágio",
      Author: "CFO Alunos - CBMAP",
    },
  });
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#264653")
    .text("CBMAP / ACADEMIA DE BOMBEIRO MILITAR");
  doc.moveDown();
  doc
    .fontSize(20)
    .text(term ? "Termo de cumprimento de carga horária" : "Relatório individual de estágio");
  doc.moveDown(0.7);
  for (const section of sections(data, term)) {
    if (doc.y > doc.page.height - 150) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#264653").text(section.title);
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10).fillColor("#202b33");
    for (const line of section.lines) {
      doc.text(line, { lineGap: 3 });
      doc.moveDown(0.35);
    }
    doc.moveDown(0.8);
  }
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(
        `CFO Alunos - uso administrativo | ${i + 1} / ${range.count}`,
        48,
        doc.page.height - 35,
        { lineBreak: false },
      );
  }
  doc.end();
  return output;
}
export async function buildIndividualExcel(data: IndividualReport): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = "CFO Alunos";
  book.created = new Date(data.issuedAt);
  const summary = book.addWorksheet("Carga");
  summary.columns = [
    { header: "Informação", key: "a", width: 34 },
    { header: "Valor", key: "b", width: 65 },
  ];
  const c = data.workload[0]!;
  summary.addRows([
    ["Cadete", `${c.student_number} - ${c.war_name}`],
    ["Programa", data.program.name],
    ["Emitido em", formatReportDateTime(data.issuedAt)],
    ["Homologadas (horas)", c.validated_minutes / 60],
    ["Mínimo (horas)", data.program.required_minutes / 60],
    ["Restantes (horas)", c.missing_required_minutes / 60],
    ["Dia ao 1º Ano", "Não integra a carga curricular"],
  ]);
  const shifts = book.addWorksheet("Plantões");
  shifts.addRow([
    "Início",
    "Término",
    "Serviço",
    "Local",
    "Situação",
    "Previstas (h)",
    "Realizadas (h)",
    "Homologadas (h)",
    "Oficial responsável pelo serviço",
    "Referência",
  ]);
  data.schedule.forEach((r) =>
    shifts.addRow([
      formatReportDateTime(r.starts_at),
      formatReportDateTime(r.ends_at),
      r.activity_name,
      r.site_name,
      internshipStatusLabel(r),
      r.planned_minutes / 60,
      r.performed_minutes === null ? null : r.performed_minutes / 60,
      r.approved_minutes === null ? null : r.approved_minutes / 60,
      r.supervisor_name,
      r.document_reference,
    ]),
  );
  const evals = book.addWorksheet("Avaliações");
  evals.addRow([
    "Participação",
    "Serviço",
    "Local",
    "Início do plantão",
    "Versão",
    "Situação",
    "Oficial",
    "Unidade",
    ...evaluationCriteria.map((c) => c.title),
    "Critério técnico 1",
    "Resposta técnica 1",
    "Critério técnico 2",
    "Resposta técnica 2",
    "Ocorrências acompanhadas",
    "Atividades observadas",
    "Ponto positivo",
    "Devolutiva ao cadete",
    "Orientações",
    "Ocorrência",
    "Revisão administrativa",
  ]);
  data.evaluations.forEach((e) => {
    const ratings = (e.ratings ?? {}) as Record<string, string>;
    const context = (e.context ?? {}) as Record<string, string>;
    const parsedDetails = evaluationDetailsSchema.safeParse(e.details);
    const details = parsedDetails.success ? parsedDetails.data : null;
    const technical = evaluationTechnicalCriteria[evaluationServiceCode(context.activity_name ?? "")];
    evals.addRow([
      e.assignment_id,
      context.activity_name,
      context.site_name,
      context.starts_at ? formatReportDateTime(context.starts_at) : "",
      e.version,
      evaluationStatus[e.status],
      e.evaluator_name,
      e.evaluator_unit,
      ...evaluationCriteria.map(
        (c) => evaluationAnswers.find((a) => a.value === ratings[c.key])?.label ?? "Sem resposta",
      ),
      technical[0]?.title ?? "",
      evaluationAnswers.find((answer) => answer.value === details?.technicalRatings[technical[0]?.key ?? ""])?.label ?? "",
      technical[1]?.title ?? "",
      evaluationAnswers.find((answer) => answer.value === details?.technicalRatings[technical[1]?.key ?? ""])?.label ?? "",
      details?.occurrenceCount ?? "",
      details?.activities.map((value) => evaluationActivities.find((activity) => activity.value === value)?.label ?? value).join(", ") ?? "",
      details?.positiveNote ?? "",
      details?.feedbackGiven === "sim" ? "Sim" : details?.feedbackGiven === "nao" ? "Não" : "",
      e.guidance,
      e.incident_note,
      e.review_note,
    ]);
  });
  for (const sheet of book.worksheets) {
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF264653" } };
    sheet.columns.forEach((col) => {
      if (sheet !== summary) col.width = 28;
      col.alignment = { wrapText: true, vertical: "top" };
    });
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
