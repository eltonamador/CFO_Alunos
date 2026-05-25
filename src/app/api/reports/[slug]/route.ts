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
import {
  buildFichaCompletaPDF,
  buildPendenciasEnxovalPDF,
  buildSaudePDF,
  buildEmergenciaPDF,
  buildFichaPersonalizadaPDF,
} from "@/lib/reports/pdf-builders";

type Builder = (supabase: ReturnType<typeof createSupabaseServerClient>, selectedFields?: string[]) => Promise<any>;

interface ReportSpec {
  label: string;
  xlsx?: Builder; // ficha-personalizada não tem versão XLSX
  pdf: Builder;
}

const REPORTS: Record<string, ReportSpec> = {
  "ficha-completa": {
    label: "Ficha_Completa_CFO2026.1",
    xlsx: buildFichaCompletaWorkbook as Builder,
    pdf: buildFichaCompletaPDF as Builder,
  },
  "ficha-personalizada": {
    label: "Ficha_Personalizada_CFO2026.1",
    pdf: buildFichaPersonalizadaPDF as Builder,
  },
  "pendencias-enxoval": {
    label: "Pendencias_Enxoval_CFO2026.1",
    xlsx: buildPendenciasEnxovalWorkbook as Builder,
    pdf: buildPendenciasEnxovalPDF as Builder,
  },
  saude: {
    label: "Restricoes_Saude_CFO2026.1",
    xlsx: buildSaudeWorkbook as Builder,
    pdf: buildSaudePDF as Builder,
  },
  emergencia: {
    label: "Contatos_Emergencia_CFO2026.1",
    xlsx: buildEmergenciaWorkbook as Builder,
    pdf: buildEmergenciaPDF as Builder,
  },
};

async function handleReportRequest(
  req: NextRequest,
  slug: string,
  selectedFields?: string[]
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
  const report = REPORTS[slug];
  if (!report) {
    return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 });
  }

  // 4. Saúde é restrito à Coordenação (LGPD)
  if (slug === "saude" && session.role !== "coordenacao") {
    return NextResponse.json({ error: "Acesso restrito à Coordenação" }, { status: 403 });
  }

  // 5. Formato (?format=pdf|xlsx — default xlsx)
  const format = (req.nextUrl.searchParams.get("format") ?? "xlsx").toLowerCase();
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ error: "Formato inválido (use xlsx ou pdf)" }, { status: 400 });
  }

  // 6. Ficha personalizada só existe em PDF
  if (format === "xlsx" && !report.xlsx) {
    return NextResponse.json(
      { error: "Este relatório só está disponível em PDF" },
      { status: 400 },
    );
  }

  // 7. Gera o arquivo
  const supabase = createSupabaseServerClient();

  try {
    const buffer =
      format === "pdf"
        ? await report.pdf(supabase as any, selectedFields)
        : await report.xlsx!(supabase as any);

    const date = new Date().toISOString().slice(0, 10);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    const filename = `${report.label}_${date}.${ext}`;
    const contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error(`[reports/${slug}/${format}] erro:`, err);
    return NextResponse.json(
      { error: "Falha ao gerar relatório", detail: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  return handleReportRequest(req, params.slug);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const body = await req.json();
    const selectedFields = Array.isArray(body?.selectedFields) ? body.selectedFields : undefined;
    return handleReportRequest(req, params.slug, selectedFields);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
}
