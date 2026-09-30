import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "@/modules/internship-management/domain/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadInternshipReportData } from "@/lib/reports/internship-report-data";
import { loadPermanenceContext } from "@/modules/internship-management/infrastructure/permanenceContext";
import { type InternshipUniformCode } from "@/modules/internship-management/domain/uniforms";
import {
  type OperationalInternshipRow,
  type OperationalInternshipScaleDraft,
} from "@/lib/reports/internship-operational-scale";
import { type InternshipScaleSignatory } from "@/lib/reports/internship-operational-pdf";

import { issueVersionedScale, archivedPdfResponse } from "@/lib/reports/internship-scale-revisions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!canManageInternship(session))
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const rosterId = request.nextUrl.searchParams.get("escala");
  const signatory = request.nextUrl.searchParams.get("assinatura") ?? "coordenador";
  if (!z.string().uuid().safeParse(rosterId).success)
    return NextResponse.json({ error: "Escala inválida" }, { status: 400 });
  if (signatory !== "coordenador" && signatory !== "supervisor")
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });

  try {
    const db = createSupabaseServerClient();
    const data = await loadInternshipReportData(db);
    const duty = (await loadPermanenceContext(db, data.program.id))
      .filter(
        (row) =>
          row.rosterId === rosterId &&
          row.editable &&
          row.startsAt &&
          row.endsAt &&
          ["prevista", "confirmada"].includes(row.status),
      )
      .sort((a, b) => a.role.localeCompare(b.role));
    if (!duty.length) return NextResponse.json({ error: "Escala indisponível" }, { status: 404 });

    const workload = new Map(
      data.workload.map((row) => [row.student_id, Number(row.validated_minutes)]),
    );
    const rows: OperationalInternshipRow[] = duty.map((row) => ({
      shiftId: row.rosterId,
      studentNumber: row.studentNumber ?? 0,
      warName: row.warName ?? "Cadete",
      activityName: "Dia ao 1º Ano",
      siteName: row.location ?? "ABM",
      resourceName: row.role,
      startsAt: row.startsAt!,
      endsAt: row.endsAt!,
      uniformCode: (row.uniformCode ?? "3A") as InternshipUniformCode,
      validatedMinutes: workload.get(row.studentId) ?? 0,
    }));
    const periodStart = duty[0]!.date;
    const periodEnd = periodStart;
    const scale: OperationalInternshipScaleDraft = {
      title: "ESCALA DE DIA AO 1º ANO CFO1",
      service: "permanencia",
      programId: data.program.id,
      programName: data.program.name,
      periodStart,
      periodEnd,
      issuedAt: new Date().toISOString(),
      rows,
    };
    const { archive, referenceCode } = await issueVersionedScale(
      db,
      scale,
      signatory as InternshipScaleSignatory,
      { sourceRosterId: rosterId! },
    );
    return archivedPdfResponse(archive, referenceCode);
  } catch (error) {
    console.error("Falha ao gerar escala de permanência", error);
    return NextResponse.json({ error: "Não foi possível carregar a escala" }, { status: 500 });
  }
}
