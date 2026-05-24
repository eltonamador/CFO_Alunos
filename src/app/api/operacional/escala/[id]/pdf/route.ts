/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { getSession } from "@/modules/identity/presentation/session";
import { formatStudentLabel } from "@/modules/operational-duty/infrastructure/queries";

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc.rect(0, 0, doc.page.width, 72).fill("#7B1818");
  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("CBMAP - ABM", 36, 16)
    .fontSize(16)
    .text(title, 36, 31)
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#FFE4E4")
    .text(subtitle, 36, 53);
  doc.y = 96;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !["coordenacao", "instrutor"].includes(session.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const supabase = createServerClientUntyped();
  const { data: roster, error: rosterError } = await supabase
    .from("duty_rosters")
    .select("id, period_start, period_end, status")
    .eq("id", params.id)
    .maybeSingle();
  if (rosterError || !roster) {
    return NextResponse.json({ error: "Escala nao encontrada" }, { status: 404 });
  }

  const { data: assignments, error } = await supabase
    .from("duty_assignments")
    .select("id, duty_date, role_id, student_id, status")
    .eq("roster_id", params.id)
    .in("status", ["prevista", "confirmada"])
    .order("duty_date");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const roleIds = [...new Set((assignments ?? []).map((item: any) => item.role_id))];
  const studentIds = [...new Set((assignments ?? []).map((item: any) => item.student_id))];
  const [{ data: roles }, { data: students }] = await Promise.all([
    supabase.from("duty_roles").select("id, name, sort_order").in("id", roleIds),
    supabase.from("students").select("id, war_name, student_number").in("id", studentIds),
  ]);

  const rolesById = new Map((roles ?? []).map((role: any) => [role.id, role]));
  const studentsById = new Map((students ?? []).map((student: any) => [student.id, student]));
  const rows = (assignments ?? [])
    .map((assignment: any) => ({
      date: assignment.duty_date,
      role: rolesById.get(assignment.role_id)?.name ?? "-",
      order: rolesById.get(assignment.role_id)?.sort_order ?? 99,
      student: formatStudentLabel(studentsById.get(assignment.student_id) ?? {}),
      status: assignment.status,
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.order - b.order);

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 96, left: 36, right: 36, bottom: 50 },
  });

  drawHeader(
    doc,
    "Escala Operacional da Turma",
    `Periodo ${roster.period_start} a ${roster.period_end} - CFO 2026.1`,
  );

  const startX = 36;
  const widths = [95, 220, 300, 120];
  const headerY = doc.y;
  doc.rect(startX, headerY, 735, 24).fill("#5F1111");
  ["Data", "Funcao", "Aluno", "Status"].forEach((label, index) => {
    const width = widths[index] ?? 0;
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(label, startX + widths.slice(0, index).reduce((a, b) => a + b, 0) + 6, headerY + 7, {
        width: width - 12,
      });
  });
  doc.y = headerY + 24;

  rows.forEach((row: any, index: number) => {
    if (doc.y > doc.page.height - 74) {
      doc.addPage();
      drawHeader(doc, "Escala Operacional da Turma", "Continuidade");
    }
    const y = doc.y;
    if (index % 2 === 0) doc.rect(startX, y, 735, 26).fill("#F6F3EE");
    let x = startX;
    [row.date, row.role, row.student, row.status].forEach((value, cellIndex) => {
      const width = widths[cellIndex] ?? 0;
      doc
        .fillColor("#1A1A1A")
        .font("Helvetica")
        .fontSize(8)
        .text(value, x + 6, y + 8, { width: width - 12, height: 14, ellipsis: true });
      doc.rect(x, y, width, 26).strokeColor("#D8D2C7").lineWidth(0.35).stroke();
      x += width;
    });
    doc.y = y + 26;
  });

  doc
    .fillColor("#5F6673")
    .font("Helvetica")
    .fontSize(7)
    .text("Documento gerado automaticamente pelo Sistema CFO Alunos - CBMAP", 36, doc.page.height - 36);

  const buffer = await pdfToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="escala-operacional-CFO2026-${roster.period_start}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
