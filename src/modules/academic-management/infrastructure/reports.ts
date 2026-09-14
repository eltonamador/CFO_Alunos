/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { projectedWorkload } from "../domain/instructionJournal";

const headerFill: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1D3557" },
};

export type InstructionReportFilter = {
  courseId?: string | null;
  academicYearId?: string | null;
  classId?: string | null;
  phase?: number | null;
  disciplineId?: string | null;
  instructorId?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
};

function macapaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Belem" }).format(new Date());
}

function dateInRange(value: string, filter: InstructionReportFilter) {
  return (!filter.startsOn || value >= filter.startsOn) && (!filter.endsOn || value <= filter.endsOn);
}

async function reportData(client: SupabaseClient<any, any, any>, filter: InstructionReportFilter) {
  const [offerings, disciplines, classes, years, sessions, instructors, assignments, enrollments, attendance] =
    await Promise.all([
      client.from("academic_offerings").select("*").eq("active", true),
      client.from("academic_disciplines").select("id,name,code,phase"),
      client.from("classes").select("id,name,course_id"),
      client.from("academic_years").select("id,year,course_id,starts_on,ends_on,status"),
      client.from("academic_instruction_sessions").select("*"),
      client.from("academic_session_instructors").select("*"),
      client.from("academic_assignments").select("*"),
      client.from("academic_enrollments").select("id,offering_id,student_label"),
      client.from("academic_session_attendances").select("*"),
    ]);
  const error = [offerings, disciplines, classes, years, sessions, instructors, assignments, enrollments, attendance]
    .map((item) => item.error)
    .find(Boolean);
  if (error) throw error;

  const disciplineById = new Map((disciplines.data ?? []).map((item: any) => [item.id, item]));
  const classById = new Map((classes.data ?? []).map((item: any) => [item.id, item]));
  const allAssignments = assignments.data ?? [];
  const filteredOfferings = (offerings.data ?? []).filter((offering: any) => {
    const discipline = disciplineById.get(offering.discipline_id);
    const academicClass = classById.get(offering.class_id);
    return (
      (!filter.academicYearId || offering.academic_year_id === filter.academicYearId) &&
      (!filter.courseId || academicClass?.course_id === filter.courseId) &&
      (!filter.classId || offering.class_id === filter.classId) &&
      (!filter.phase || discipline?.phase === filter.phase) &&
      (!filter.disciplineId || offering.discipline_id === filter.disciplineId) &&
      (!filter.instructorId ||
        allAssignments.some(
          (assignment: any) => assignment.offering_id === offering.id && assignment.profile_id === filter.instructorId,
        ))
    );
  });
  const offeringIds = new Set(filteredOfferings.map((item: any) => item.id));
  const filteredSessions = (sessions.data ?? []).filter(
    (session: any) => offeringIds.has(session.offering_id) && dateInRange(session.scheduled_on, filter),
  );
  const sessionIds = new Set(filteredSessions.map((item: any) => item.id));
  return {
    offerings: filteredOfferings,
    disciplines: disciplines.data ?? [],
    classes: classes.data ?? [],
    years: years.data ?? [],
    sessions: filteredSessions,
    instructors: (instructors.data ?? []).filter(
      (item: any) => sessionIds.has(item.session_id) && (!filter.instructorId || item.profile_id === filter.instructorId),
    ),
    assignments: allAssignments.filter(
      (item: any) => offeringIds.has(item.offering_id) && (!filter.instructorId || item.profile_id === filter.instructorId),
    ),
    enrollments: (enrollments.data ?? []).filter((item: any) => offeringIds.has(item.offering_id)),
    attendance: (attendance.data ?? []).filter((item: any) => sessionIds.has(item.session_id)),
  };
}

function addHeader(sheet: ExcelJS.Worksheet, labels: string[]) {
  const row = sheet.addRow(labels);
  row.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}
function finishSheet(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let max = 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      max = Math.max(max, cell.text?.length ?? 0);
    });
    column.width = Math.min(max + 2, 45);
  });
}
function labelProjection(status: ReturnType<typeof projectedWorkload>["status"]) {
  return status === "on_track" ? "Em dia" : status === "deficit_risk" ? "Risco de déficit" : "Dados insuficientes";
}

export async function buildInstructionWorkbook(
  client: SupabaseClient<any, any, any>,
  filter: InstructionReportFilter,
): Promise<ExcelJS.Buffer> {
  const data = await reportData(client, filter);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CFO Alunos";
  workbook.created = new Date();
  const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]));
  const disciplineById = byId(data.disciplines);
  const classById = byId(data.classes);
  const sessionById = byId(data.sessions);
  const today = macapaDate();
  const offeringRows = data.offerings.map((offering: any) => {
    const sessionRows = data.sessions.filter((session: any) => session.offering_id === offering.id);
    const taught = sessionRows
      .filter((session: any) => session.status === "validated")
      .reduce((sum: number, session: any) => sum + Number(session.taught_hours ?? 0), 0);
    const planned = sessionRows
      .filter((session: any) => ["planned", "proposed"].includes(session.status))
      .reduce((sum: number, session: any) => sum + Number(session.planned_hours ?? 0), 0);
    const scheduledFuture = sessionRows
      .filter((session: any) => ["planned", "proposed"].includes(session.status) && session.scheduled_on >= today)
      .reduce((sum: number, session: any) => sum + Number(session.planned_hours ?? 0), 0);
    const projection = projectedWorkload({
      adoptedHours: Number(offering.workload_hours),
      taughtHours: taught,
      scheduledFutureHours: scheduledFuture,
      hasAcademicYear: Boolean(offering.academic_year_id),
      hasMappedFuturePlan: scheduledFuture > 0,
    });
    return { offering, sessionRows, taught, planned, projection };
  });

  const disciplineSheet = workbook.addWorksheet("Carga por disciplina", { pageSetup: { orientation: "landscape", fitToWidth: 1 } });
  addHeader(disciplineSheet, ["Turma", "Disciplina", "Fase", "CH adotada", "Ministrada", "Planejada", "Restante", "Canceladas", "Remarcadas", "Projeção"]);
  for (const row of offeringRows) {
    const discipline = disciplineById.get(row.offering.discipline_id);
    disciplineSheet.addRow([
      classById.get(row.offering.class_id)?.name ?? "Turma",
      discipline?.name ?? "Disciplina",
      discipline?.phase ?? "",
      row.offering.workload_hours,
      row.taught,
      row.planned,
      row.projection.remainingHours,
      row.sessionRows.filter((session: any) => session.status === "cancelled").length,
      row.sessionRows.filter((session: any) => session.status === "rescheduled").length,
      labelProjection(row.projection.status),
    ]);
  }
  finishSheet(disciplineSheet);

  const instructorSheet = workbook.addWorksheet("Carga por instrutor", { pageSetup: { orientation: "landscape", fitToWidth: 1 } });
  addHeader(instructorSheet, ["Instrutor", "Disciplina", "Turma", "Aulas validadas", "Horas instrucionais", "Planejadas", "Propostas", "Canceladas", "Situação"]);
  const instructorRows = new Map<string, { name: string; offeringId: string; validated: number; hours: number; planned: number; proposed: number; cancelled: number }>();
  for (const assignment of data.assignments as any[]) {
    instructorRows.set(`${assignment.id}:${assignment.offering_id}`, {
      name: assignment.display_name,
      offeringId: assignment.offering_id,
      validated: 0,
      hours: 0,
      planned: 0,
      proposed: 0,
      cancelled: 0,
    });
  }
  for (const session of data.sessions as any[]) {
    for (const person of data.instructors.filter((item: any) => item.session_id === session.id) as any[]) {
      const key = `${person.assignment_id ?? person.id}:${session.offering_id}`;
      const row = instructorRows.get(key) ?? {
        name: person.display_name,
        offeringId: session.offering_id,
        validated: 0,
        hours: 0,
        planned: 0,
        proposed: 0,
        cancelled: 0,
      };
      if (session.status === "validated") {
        row.validated += 1;
        row.hours += Number(session.taught_hours ?? 0);
      }
      if (session.status === "planned") row.planned += 1;
      if (session.status === "proposed") row.proposed += 1;
      if (session.status === "cancelled") row.cancelled += 1;
      instructorRows.set(key, row);
    }
  }
  for (const row of instructorRows.values()) {
    const offering = data.offerings.find((item: any) => item.id === row.offeringId);
    instructorSheet.addRow([
      row.name,
      disciplineById.get(offering?.discipline_id)?.name ?? "Disciplina",
      classById.get(offering?.class_id)?.name ?? "Turma",
      row.validated,
      row.hours,
      row.planned,
      row.proposed,
      row.cancelled,
      row.validated === 0 ? "Sem trabalho confirmado" : "Com carga validada",
    ]);
  }
  finishSheet(instructorSheet);

  const attendanceSheet = workbook.addWorksheet("Frequência por cadete", { pageSetup: { orientation: "landscape", fitToWidth: 1 } });
  addHeader(attendanceSheet, ["Cadete", "Disciplina", "Turma", "Presenças", "Faltas justificadas", "Faltas injustificadas", "Frequência", "Origem"]);
  for (const enrollment of data.enrollments as any[]) {
    const records = data.attendance.filter((record: any) => record.enrollment_id === enrollment.id);
    const total = records.length;
    const present = records.filter((record: any) => record.status === "present").length;
    const justified = records.filter((record: any) => record.status === "justified_absence").length;
    const unjustified = records.filter((record: any) => record.status === "unjustified_absence").length;
    const offering = data.offerings.find((item: any) => item.id === enrollment.offering_id);
    attendanceSheet.addRow([
      enrollment.student_label,
      disciplineById.get(offering?.discipline_id)?.name ?? "",
      classById.get(offering?.class_id)?.name ?? "",
      present,
      justified,
      unjustified,
      total ? `${((present / total) * 100).toFixed(2)}%` : "—",
      "Diário por aula (legado consolidado permanece na ficha)",
    ]);
  }
  finishSheet(attendanceSheet);

  const detailSheet = workbook.addWorksheet("Frequência por aula", { pageSetup: { orientation: "landscape", fitToWidth: 1 } });
  addHeader(detailSheet, ["Data", "Disciplina", "Cadete", "Situação", "Carga da aula"]);
  for (const record of data.attendance as any[]) {
    const session = sessionById.get(record.session_id) as any;
    const enrollment = data.enrollments.find((item: any) => item.id === record.enrollment_id) as any;
    const offering = data.offerings.find((item: any) => item.id === session?.offering_id) as any;
    detailSheet.addRow([
      session?.scheduled_on ?? "",
      disciplineById.get(offering?.discipline_id)?.name ?? "",
      enrollment?.student_label ?? "",
      record.status === "present" ? "Presente" : record.status === "justified_absence" ? "Falta justificada" : "Falta injustificada",
      session?.taught_hours ?? "",
    ]);
  }
  finishSheet(detailSheet);
  return workbook.xlsx.writeBuffer();
}

export async function buildInstructionPdf(
  client: SupabaseClient<any, any, any>,
  filter: InstructionReportFilter,
): Promise<Buffer> {
  const data = await reportData(client, filter);
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.fontSize(16).text("CFO Alunos — Carga instrucional", { align: "center" });
  doc.moveDown(0.5).fontSize(9).fillColor("#555555").text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
  doc.moveDown().fillColor("#111111").fontSize(10);
  for (const offering of data.offerings as any[]) {
    const discipline = data.disciplines.find((item: any) => item.id === offering.discipline_id) as any;
    const sessions = data.sessions.filter((item: any) => item.offering_id === offering.id);
    const taught = sessions.filter((item: any) => item.status === "validated").reduce((sum: number, item: any) => sum + Number(item.taught_hours ?? 0), 0);
    const scheduledFuture = sessions.filter((item: any) => ["planned", "proposed"].includes(item.status) && item.scheduled_on >= macapaDate()).reduce((sum: number, item: any) => sum + Number(item.planned_hours ?? 0), 0);
    const projection = projectedWorkload({ adoptedHours: Number(offering.workload_hours), taughtHours: taught, scheduledFutureHours: scheduledFuture, hasAcademicYear: Boolean(offering.academic_year_id), hasMappedFuturePlan: scheduledFuture > 0 });
    doc.font("Helvetica-Bold").text(discipline?.name ?? "Disciplina");
    doc.font("Helvetica").text(`Adotada: ${offering.workload_hours} h/a · Ministrada: ${taught.toFixed(2)} h/a · Planejada à frente: ${scheduledFuture.toFixed(2)} h/a · Restante: ${projection.remainingHours.toFixed(2)} h/a · ${labelProjection(projection.status)}`);
    doc.moveDown(0.35);
    if (doc.y > 500) doc.addPage();
  }
  doc.end();
  return done;
}
