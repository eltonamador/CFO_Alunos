/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { formatStudentLabel } from "@/modules/operational-duty/infrastructure/queries";
import { __internals } from "@/lib/reports/pdf-builders";

const { createDoc, stampChrome, renderTable, pdfToBuffer } = __internals;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR");
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !["coordenacao", "instrutor"].includes(session.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data: roster, error: rosterError } = await supabase
    .from("duty_rosters")
    .select("id, period_start, period_end, status")
    .eq("id", params.id)
    .maybeSingle();
  if (rosterError || !roster) {
    return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });
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
    .map((a: any) => ({
      date: a.duty_date,
      role: rolesById.get(a.role_id)?.name ?? "—",
      order: rolesById.get(a.role_id)?.sort_order ?? 99,
      student: formatStudentLabel(studentsById.get(a.student_id) ?? {}),
      status: (a.status ?? "").replace(/_/g, " "),
    }))
    .sort(
      (a: any, b: any) => String(a.date).localeCompare(String(b.date)) || a.order - b.order,
    );

  const opts = {
    title: "Escala Operacional",
    subtitle: `CBMAP · ABM · CFO 2026.1 — Período: ${formatDate(roster.period_start)} a ${formatDate(roster.period_end)}`,
  };

  const doc = createDoc();
  renderTable(
    doc,
    opts,
    ["Data", "Função", "Aluno", "Status"],
    rows.map((r: any) => [formatDate(r.date), r.role, r.student, r.status]),
    [0.14, 0.26, 0.42, 0.18],
  );
  stampChrome(doc, opts);

  const buffer = await pdfToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="escala-operacional-CFO2026-${roster.period_start}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
