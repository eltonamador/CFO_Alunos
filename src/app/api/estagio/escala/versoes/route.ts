import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "@/modules/internship-management/domain/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  archivedPdfResponse,
  type ArchivedScale,
  scaleSnapshot,
  sameScaleSnapshot,
} from "@/lib/reports/internship-scale-revisions";
import {
  formatInternshipScaleNumber,
  loadOperationalInternshipScale,
} from "@/lib/reports/internship-operational-scale";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const filters = z
  .object({
    inicio: z.string().date(),
    fim: z.string().date(),
    servico: z.enum(["estagio", "todos", "gbm", "praia", "permanencia"]),
    gbm: z.string().uuid().optional(),
    escala: z.string().uuid().optional(),
    assinatura: z.enum(["coordenador", "supervisor"]).default("coordenador"),
  })
  .refine(
    (v) =>
      v.inicio <= v.fim &&
      (!v.gbm || v.servico === "gbm") &&
      (!v.escala || v.servico === "permanencia"),
  );
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!canManageInternship(session))
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const db = createSupabaseServerClient();
  const id = request.nextUrl.searchParams.get("id");
  try {
    if (id) {
      if (!z.string().uuid().safeParse(id).success)
        return NextResponse.json({ error: "Versão inválida" }, { status: 400 });
      const result = await db
        .from("internship_scale_revisions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return NextResponse.json({ error: "Versão indisponível" }, { status: 404 });
      const archive = result.data as unknown as ArchivedScale;
      const number = await db
        .from("internship_scale_numbers")
        .select("sequence_number,period_start,voided_at")
        .eq("id", archive.scale_number_id)
        .single();
      if (number.error || !number.data) throw new Error("Numeração indisponível");
      if (number.data.voided_at)
        return NextResponse.json(
          { error: "Emissão desconsiderada. Baixe a escala atual." },
          { status: 410 },
        );
      return archivedPdfResponse(
        archive,
        formatInternshipScaleNumber(number.data.sequence_number, number.data.period_start),
        true,
      );
    }
    const parsed = filters.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ error: "Filtros inválidos" }, { status: 400 });
    const f = parsed.data;
    const draft = await loadOperationalInternshipScale(db, f.inicio, f.fim, f.servico, f.gbm);
    if (f.escala) draft.rows = draft.rows.filter((row) => row.shiftId === f.escala);
    let query = db
      .from("internship_scale_numbers")
      .select("id,sequence_number,period_start")
      .is("voided_at", null)
      .eq("program_id", draft.programId)
      .eq("service", f.servico)
      .eq("period_start", f.inicio)
      .eq("period_end", f.fim);
    query = f.escala ? query.eq("source_roster_id", f.escala) : query.is("source_roster_id", null);
    query = f.gbm ? query.eq("gbm_site_id", f.gbm) : query.is("gbm_site_id", null);
    const number = await query.maybeSingle();
    if (number.error) throw number.error;
    if (!number.data)
      return NextResponse.json(
        { versions: [], changed: false },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    const versions = await db
      .from("internship_scale_revisions")
      .select("id,revision,rectification,issued_at,change_summary,snapshot")
      .eq("scale_number_id", number.data.id)
      .order("revision", { ascending: false });
    if (versions.error) throw versions.error;
    const rows = versions.data ?? [];
    const latest = rows[0];
    return NextResponse.json(
      {
        referenceCode: formatInternshipScaleNumber(
          number.data.sequence_number,
          number.data.period_start,
        ),
        changed:
          !!latest &&
          !sameScaleSnapshot(
            latest.snapshot as unknown as ArchivedScale["snapshot"],
            scaleSnapshot(draft, f.assinatura),
          ),
        versions: rows.map(({ snapshot: _, ...v }) => v),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Falha no histórico de PDFs", error);
    return NextResponse.json({ error: "Não foi possível consultar o histórico." }, { status: 500 });
  }
}
