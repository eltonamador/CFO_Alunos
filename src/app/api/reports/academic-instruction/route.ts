import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import {
  buildInstructionPdf,
  buildInstructionWorkbook,
  type InstructionReportFilter,
} from "@/modules/academic-management/infrastructure/reports";

const uuid = /^[0-9a-f-]{36}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.active) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["coordenacao", "secretaria"].includes(session.role))
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const format = request.nextUrl.searchParams.get("format") ?? "xlsx";
  const readId = (name: string) => request.nextUrl.searchParams.get(name) || null;
  const filter: InstructionReportFilter = {
    courseId: readId("courseId"),
    academicYearId: readId("academicYearId"),
    classId: readId("classId"),
    disciplineId: readId("disciplineId"),
    instructorId: readId("instructorId"),
    startsOn: request.nextUrl.searchParams.get("startsOn") || null,
    endsOn: request.nextUrl.searchParams.get("endsOn") || null,
  };
  const phaseValue = request.nextUrl.searchParams.get("phase");
  if (phaseValue) filter.phase = Number(phaseValue);
  if (!["xlsx", "pdf"].includes(format))
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  if (Object.entries(filter).some(([key, value]) => key.endsWith("Id") && value && !uuid.test(String(value))))
    return NextResponse.json({ error: "Um dos filtros de identificação é inválido." }, { status: 400 });
  if ((filter.startsOn && !date.test(filter.startsOn)) || (filter.endsOn && !date.test(filter.endsOn)) || (filter.startsOn && filter.endsOn && filter.startsOn > filter.endsOn))
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  const phase = filter.phase;
  if (phase !== undefined && phase !== null && (!Number.isInteger(phase) || phase < 1 || phase > 3))
    return NextResponse.json({ error: "Fase inválida." }, { status: 400 });
  try {
    const client = createSupabaseServerClient();
    const body =
      format === "pdf"
        ? await buildInstructionPdf(client as Parameters<typeof buildInstructionPdf>[0], filter)
        : await buildInstructionWorkbook(client as Parameters<typeof buildInstructionWorkbook>[0], filter);
    const extension = format === "pdf" ? "pdf" : "xlsx";
    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Carga_Instrucional_${new Date().toISOString().slice(0, 10)}.${extension}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao gerar relatório acadêmico.", detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
