import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "@/modules/internship-management/domain/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadInternshipReportData } from "@/lib/reports/internship-report-data";
import {
  buildIndividualExcel,
  buildIndividualPDF,
  canIssueWorkloadTerm,
} from "@/lib/reports/internship-individual";
import { readAll } from "@/modules/internship-management/infrastructure/readAll";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageInternship(session))
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const parsed = z
    .object({ cadete: z.string().uuid(), format: z.enum(["pdf", "xlsx", "termo"]) })
    .safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  try {
    const db = createSupabaseServerClient();
    const data = await loadInternshipReportData(db);
    data.workload = data.workload.filter((r) => r.student_id === parsed.data.cadete);
    if (!data.workload.length)
      return NextResponse.json(
        { error: "Cadete ativo não encontrado no programa" },
        { status: 404 },
      );
    data.schedule = data.schedule.filter((r) => r.student_id === parsed.data.cadete);
    const ids = new Set(data.schedule.map((r) => r.assignment_id));
    const evaluations = (
      await readAll((from, to) =>
        db
          .from("internship_evaluations")
          .select("*")
          .eq("student_id", parsed.data.cadete)
          .order("created_at")
          .order("id")
          .range(from, to),
      )
    ).filter((e) => ids.has(e.assignment_id));
    const report = { ...data, evaluations, issuedAt: new Date().toISOString() };
    const term = parsed.data.format === "termo";
    if (term && !canIssueWorkloadTerm(report))
      return NextResponse.json({ error: "Carga mínima ainda não atingida" }, { status: 409 });
    const excel = parsed.data.format === "xlsx";
    const buffer = excel
      ? await buildIndividualExcel(report)
      : await buildIndividualPDF(report, term);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": excel
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
        "Content-Disposition": `${excel ? "attachment" : "inline"}; filename="estagio-${data.workload[0]!.student_number}-${parsed.data.format}.${excel ? "xlsx" : "pdf"}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Falha no relatório individual", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o relatório individual." },
      { status: 500 },
    );
  }
}
