/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import {
  buildFichaCompletaWorkbook,
  buildPendenciasEnxovalWorkbook,
  buildSaudeWorkbook,
  buildEmergenciaWorkbook,
} from "@/lib/reports/builders";

type Builder = (supabase: ReturnType<typeof createSupabaseServerClient>) => Promise<any>;

// Slugs disponíveis e seus metadados
const REPORTS: Record<string, { label: string; build: Builder }> = {
  "ficha-completa": {
    label: "Ficha_Completa_CFO2026.1",
    build: buildFichaCompletaWorkbook as Builder,
  },
  "pendencias-enxoval": {
    label: "Pendencias_Enxoval_CFO2026.1",
    build: buildPendenciasEnxovalWorkbook as Builder,
  },
  saude: {
    label: "Restricoes_Saude_CFO2026.1",
    build: buildSaudeWorkbook as Builder,
  },
  emergencia: {
    label: "Contatos_Emergencia_CFO2026.1",
    build: buildEmergenciaWorkbook as Builder,
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  // 1. Autenticação
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 2. Autorização — apenas Coordenação e Secretaria
  if (session.role !== "coordenacao" && session.role !== "secretaria") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  // 3. Valida slug
  const report = REPORTS[params.slug];
  if (!report) {
    return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 });
  }

  // 4. Gera o workbook
  const supabase = createSupabaseServerClient();
  const buffer = await report.build(supabase as any);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${report.label}_${date}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
