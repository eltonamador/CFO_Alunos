import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "@/modules/internship-management/domain/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  EvaluationContext,
  EvaluationRatings,
} from "@/modules/internship-management/domain/evaluation";
import { evaluationPrintHtml } from "@/lib/reports/internship-evaluation-print";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: { assignmentId: string } }) {
  const session = await getSession();
  if (!canManageInternship(session))
    return new NextResponse("Acesso restrito à administração do estágio.", { status: 403 });
  if (!z.string().uuid().safeParse(params.assignmentId).success)
    return new NextResponse("Ficha inválida.", { status: 400 });
  const db = createSupabaseServerClient();
  const id = request.nextUrl.searchParams.get("avaliacao");
  if (id && !z.string().uuid().safeParse(id).success)
    return new NextResponse("Avaliação inválida.", { status: 400 });
  const response = id
    ? await db
        .from("internship_evaluations")
        .select("*")
        .eq("id", id)
        .eq("assignment_id", params.assignmentId)
        .single()
    : null;
  if (id && (!response?.data?.ratings || response.error))
    return new NextResponse("Avaliação indisponível.", { status: 404 });
  const context =
    response?.data?.context ??
    (await db.rpc("internship_evaluation_assignment", { p_assignment_id: params.assignmentId }))
      .data;
  if (!context) return new NextResponse("Participação indisponível.", { status: 404 });
  const row = response?.data;
  return new NextResponse(
    evaluationPrintHtml(
      context as EvaluationContext,
      row ? { ...row, ratings: row.ratings as EvaluationRatings } : undefined,
    ),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
