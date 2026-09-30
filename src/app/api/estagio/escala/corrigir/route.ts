import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "@/modules/internship-management/domain/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadOperationalInternshipScale } from "@/lib/reports/internship-operational-scale";
import {
  correctIssuedScale,
  discardIssuedScale,
  ScaleCorrectionError,
} from "@/lib/reports/internship-scale-revisions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };
const correction = z
  .object({
    inicio: z.string().date(),
    fim: z.string().date(),
    servico: z.enum(["estagio", "todos", "gbm", "praia", "permanencia"]),
    gbm: z.string().uuid().optional(),
    escala: z.string().uuid().optional(),
    assinatura: z.enum(["coordenador", "supervisor"]).default("coordenador"),
    modo: z.enum(["correcao", "retificacao", "descartar"]),
    motivo: z.string().trim().min(5).max(300),
  })
  .refine(
    (v) =>
      v.inicio <= v.fim &&
      (!v.gbm || v.servico === "gbm") &&
      (!v.escala || v.servico === "permanencia"),
  );

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageInternship(session))
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const parsed = correction.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Escolha a situação da escala e informe o motivo com pelo menos cinco caracteres." },
      { status: 400 },
    );
  const f = parsed.data;
  try {
    const db = createSupabaseServerClient();
    const draft = await loadOperationalInternshipScale(db, f.inicio, f.fim, f.servico, f.gbm);
    if (f.escala) draft.rows = draft.rows.filter((row) => row.shiftId === f.escala);
    const filters = { gbmSiteId: f.gbm, sourceRosterId: f.escala };
    if (f.modo === "descartar") {
      const referenceCode = await discardIssuedScale(db, draft, filters, f.motivo);
      return NextResponse.json({ referenceCode }, { headers: noStore });
    }
    const { archive, referenceCode } = await correctIssuedScale(
      db,
      draft,
      f.assinatura,
      filters,
      f.modo,
      f.motivo,
    );
    return NextResponse.json(
      { id: archive.id, referenceCode, rectification: archive.rectification },
      { headers: noStore },
    );
  } catch (error) {
    if (error instanceof ScaleCorrectionError)
      return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof Error && error.message.startsWith("A escala foi atualizada"))
      return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof Error && error.message === "GBM inválido para o programa de estágio.")
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Falha ao corrigir escala de estágio", error);
    return NextResponse.json({ error: "Não foi possível corrigir a escala." }, { status: 500 });
  }
}
