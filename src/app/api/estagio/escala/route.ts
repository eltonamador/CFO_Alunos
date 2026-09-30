import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "@/modules/internship-management/domain/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadOperationalInternshipScale,
  type ScaleService,
} from "@/lib/reports/internship-operational-scale";
import { type InternshipScaleSignatory } from "@/lib/reports/internship-operational-pdf";

import { issueVersionedScale, archivedPdfResponse } from "@/lib/reports/internship-scale-revisions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const validDay = (day: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T12:00:00Z`));
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageInternship(session))
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const start = request.nextUrl.searchParams.get("inicio") ?? undefined;
  const end = request.nextUrl.searchParams.get("fim") ?? undefined;
  const service = request.nextUrl.searchParams.get("servico") ?? "estagio";
  const gbmSiteId = request.nextUrl.searchParams.get("gbm") ?? undefined;
  const signatory = request.nextUrl.searchParams.get("assinatura") ?? "coordenador";
  if (!["estagio", "todos", "gbm", "praia", "permanencia"].includes(service))
    return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });
  if (gbmSiteId && service !== "gbm")
    return NextResponse.json({ error: "Filtro de GBM inválido" }, { status: 400 });
  if (signatory !== "coordenador" && signatory !== "supervisor")
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  if ((start && !validDay(start)) || (end && !validDay(end)) || (start && end && start > end))
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  try {
    const db = createSupabaseServerClient();
    const draft = await loadOperationalInternshipScale(
      db,
      start,
      end,
      service as ScaleService,
      gbmSiteId,
    );
    if (!draft.rows.length) {
      let query = db
        .from("internship_scale_numbers")
        .select("id")
        .is("voided_at", null)
        .eq("program_id", draft.programId)
        .eq("service", draft.service)
        .eq("period_start", draft.periodStart)
        .eq("period_end", draft.periodEnd)
        .is("source_roster_id", null);
      query = gbmSiteId ? query.eq("gbm_site_id", gbmSiteId) : query.is("gbm_site_id", null);
      const number = await query.maybeSingle();
      if (number.error) throw number.error;
      const previous = number.data
        ? await db
            .from("internship_scale_revisions")
            .select("id")
            .eq("scale_number_id", number.data.id)
            .limit(1)
        : null;
      if (previous?.error) throw previous.error;
      if (!previous?.data?.length)
        return NextResponse.json(
          { error: "Nenhum serviço publicado neste recorte." },
          { status: 404 },
        );
    }
    const { archive, referenceCode } = await issueVersionedScale(
      db,
      draft,
      signatory as InternshipScaleSignatory,
      { gbmSiteId },
    );
    return archivedPdfResponse(
      archive,
      referenceCode,
      request.nextUrl.searchParams.get("download") === "1",
    );
  } catch (error) {
    if (error instanceof Error && error.message === "GBM inválido para o programa de estágio.")
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Falha ao gerar escala operacional de estágio", error);
    return NextResponse.json(
      { error: "Não foi possível gerar a escala operacional." },
      { status: 500 },
    );
  }
}
