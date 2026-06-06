/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import {
  computeFichaSituacao,
  hasAllergy,
  hasCnh,
  hasPriorMilitary,
  hasVehicle,
  needsHousing,
  residesInAmapa,
  STUDENT_SELECT_COLUMNS,
  usesMedication,
  type AlunoFiltravel,
} from "@/lib/reports/filtros-avancados";

const FILENAME_BASE = "Filtros_Avancados_CFO2026.1";

const PENDING_EQUIPMENT_STATUS = [
  "falta_comprar",
  "em_duvida",
  "inadequado",
  "pendente_validacao",
] as const;
const PENDING_DOC_STATUS = ["pendente", "em_analise", "recusado"] as const;

interface RequestBody {
  ids?: unknown;
  criterios?: unknown;
  includeSensitive?: unknown;
}

function fichaLabel(s: ReturnType<typeof computeFichaSituacao>): string {
  return s === "completa" ? "Completa" : s === "incompleta" ? "Incompleta" : "Não iniciada";
}
function sexoLabel(sex: "M" | "F" | null): string {
  return sex === "M" ? "Masculino" : sex === "F" ? "Feminino" : "Não informado";
}
function enrollmentLabel(e: "pendente" | "confirmada" | null): string {
  return (e ?? "pendente") === "confirmada" ? "Confirmada" : "Pendente";
}
function simNao(v: boolean): string {
  return v ? "Sim" : "Não";
}
function residesLabel(a: AlunoFiltravel): string {
  const r = residesInAmapa(a);
  return r === true ? "Sim" : r === false ? "Não" : "n/i";
}

async function buildXlsx(
  alunos: AlunoFiltravel[],
  criterios: string[],
  includeSensitive: boolean,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CFO Alunos";
  wb.created = new Date();

  // Aba Resumo
  const ws0 = wb.addWorksheet("Resumo");
  ws0.getColumn(1).width = 30;
  ws0.getColumn(2).width = 70;
  const titleRow = ws0.addRow(["Relatório", "Filtros Avançados — CFO 2026.1"]);
  titleRow.font = { bold: true };
  ws0.addRow(["Emitido em", new Date().toLocaleString("pt-BR")]);
  ws0.addRow(["Total encontrado", alunos.length]);
  if (includeSensitive) {
    ws0.addRow([
      "Aviso LGPD",
      "Contém colunas sensíveis (saúde). Manter sob controle da Coordenação.",
    ]);
  }
  ws0.addRow([]);
  const critTitle = ws0.addRow(["Critérios aplicados"]);
  critTitle.font = { bold: true };
  criterios.forEach((c) => ws0.addRow(["", c]));

  // Aba Alunos
  const ws = wb.addWorksheet("Alunos", {
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "landscape", paperSize: 9 },
  });

  const baseHeaders = [
    "Nº",
    "Nome de Guerra",
    "Nome Completo",
    "Pelotão",
    "Sexo",
    "UF",
    "Cidade",
    "Reside AP",
    "Matrícula",
    "Ficha",
    "CNH",
    "Veículo",
    "Aloj.",
    "Gandola",
    "Calça",
    "Exp. Militar",
    "Pend. Mat.",
    "Pend. Doc.",
  ];
  const sensitiveHeaders = ["Alergia", "Medicação", "Restr. Física"];
  const headers = includeSensitive ? [...baseHeaders, ...sensitiveHeaders] : baseHeaders;

  const hdr = ws.addRow(headers);
  hdr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hdr.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D3557" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  hdr.height = 22;

  alunos.forEach((a, i) => {
    const base = [
      a.student_number ?? "",
      a.war_name,
      a.full_name,
      a.pelotao ?? "",
      sexoLabel(a.sex),
      a.student_addresses?.state ?? "",
      a.student_addresses?.city ?? "",
      residesLabel(a),
      enrollmentLabel(a.enrollment_status),
      fichaLabel(computeFichaSituacao(a)),
      simNao(hasCnh(a)),
      simNao(hasVehicle(a)),
      simNao(needsHousing(a)),
      a.student_logistics?.gandola_size ?? "",
      a.student_logistics?.pants_size ?? "",
      simNao(hasPriorMilitary(a)),
      simNao(a.has_pending_equipment),
      simNao(a.has_pending_documents),
    ];
    const row = ws.addRow(
      includeSensitive
        ? [
            ...base,
            simNao(hasAllergy(a)),
            simNao(usesMedication(a)),
            a.health_restrictions?.has_physical_restriction ? "Sim" : "Não",
          ]
        : base,
    );
    if (i % 2 === 0) {
      row.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F8" } };
      });
    }
  });

  ws.columns.forEach((col) => {
    let max = 8;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.text?.length ?? 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 38);
  });
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

async function buildPdf(
  alunos: AlunoFiltravel[],
  criterios: string[],
  includeSensitive: boolean,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 56, bottom: 44, left: 28, right: 28 },
    bufferPages: true,
    info: {
      Title: "Filtros Avançados — CFO 2026.1",
      Author: "CFO Alunos · CBMAP",
      Creator: "Sistema CFO Alunos · CBMAP",
    },
  });

  const PRIMARY = "#7B1818";
  const TEXT = "#111827";
  const MUTED = "#6B7280";
  const ZEBRA = "#F4F4F5";
  const BORDER = "#D1D5DB";
  const WARN_BG = "#FEF3C7";
  const WARN_FG = "#92400E";

  const W = doc.page.width;
  const usableW = W - 56;
  const startX = 28;

  // Cabeçalho
  doc
    .fillColor(PRIMARY)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Filtros Avançados — CFO 2026.1", startX, 28);
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(9)
    .text(
      `Emitido em ${new Date().toLocaleString("pt-BR")} · Total: ${alunos.length} aluno(s)`,
      startX,
      48,
    );

  let y = 72;
  if (includeSensitive) {
    doc.save().fillColor(WARN_BG).rect(startX, y, usableW, 16).fill().restore();
    doc
      .fillColor(WARN_FG)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(
        "LGPD: contém colunas sensíveis (saúde). Restrito à Coordenação.",
        startX + 6,
        y + 4,
        { width: usableW - 12, lineBreak: false, ellipsis: true },
      );
    y += 22;
  }
  doc.y = y;

  // Critérios
  doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(10).text("Critérios aplicados", startX, doc.y);
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(8.5).fillColor(TEXT);
  criterios.forEach((c) => {
    doc.text(`• ${c}`, startX, doc.y, { width: usableW });
  });
  doc.moveDown(0.4);

  // Tabela
  const baseHeaders = ["Nº", "Nome de Guerra", "Pel.", "Sx", "UF", "AP", "Matr.", "Ficha", "CNH", "Veíc.", "Gand.", "Calça", "Mil.", "PM", "PD"];
  const sensHeaders = ["Alerg.", "Med."];
  const headers = includeSensitive ? [...baseHeaders, ...sensHeaders] : baseHeaders;
  const fractionsBase = [0.04, 0.18, 0.05, 0.04, 0.05, 0.05, 0.08, 0.08, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
  const fractionsSens = [0.06, 0.05];
  let fractions = includeSensitive ? [...fractionsBase, ...fractionsSens] : fractionsBase;
  const sum = fractions.reduce((s, f) => s + f, 0);
  fractions = fractions.map((f) => f / sum);
  const colW = fractions.map((f) => f * usableW);
  const padX = 3;
  const padY = 3;
  const headerH = 18;

  const drawHeader = () => {
    const top = doc.y;
    doc.save().fillColor(PRIMARY).rect(startX, top, usableW, headerH).fill().restore();
    let x = startX;
    headers.forEach((h, i) => {
      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(h, x + padX, top + 5, {
          width: (colW[i] ?? 0) - padX * 2,
          lineBreak: false,
          ellipsis: true,
        });
      x += colW[i] ?? 0;
    });
    doc.y = top + headerH;
  };
  drawHeader();

  if (alunos.length === 0) {
    doc
      .fillColor(MUTED)
      .font("Helvetica-Oblique")
      .fontSize(10)
      .text("Nenhum aluno encontrado para os critérios.", startX, doc.y + 14, {
        width: usableW,
        align: "center",
      });
  } else {
    alunos.forEach((a, idx) => {
      const base = [
        a.student_number ?? "—",
        a.war_name,
        a.pelotao ?? "—",
        a.sex ?? "—",
        a.student_addresses?.state ?? "—",
        residesLabel(a),
        enrollmentLabel(a.enrollment_status),
        fichaLabel(computeFichaSituacao(a)),
        simNao(hasCnh(a)),
        simNao(hasVehicle(a)),
        a.student_logistics?.gandola_size ?? "—",
        a.student_logistics?.pants_size ?? "—",
        simNao(hasPriorMilitary(a)),
        simNao(a.has_pending_equipment),
        simNao(a.has_pending_documents),
      ];
      const cells = (includeSensitive
        ? [...base, simNao(hasAllergy(a)), simNao(usesMedication(a))]
        : base
      ).map((v) => (v === "" || v === null || v === undefined ? "—" : String(v)));

      doc.font("Helvetica").fontSize(8);
      const heights = cells.map((t, i) =>
        doc.heightOfString(t, { width: (colW[i] ?? 0) - padX * 2 }),
      );
      const rowH = Math.max(...heights, 11) + padY * 2;

      if (doc.y + rowH > doc.page.height - 44) {
        doc.addPage();
        doc.y = 56;
        drawHeader();
      }

      const top = doc.y;
      if (idx % 2 === 1) {
        doc.save().fillColor(ZEBRA).rect(startX, top, usableW, rowH).fill().restore();
      }
      doc
        .save()
        .strokeColor(BORDER)
        .lineWidth(0.4)
        .moveTo(startX, top + rowH)
        .lineTo(startX + usableW, top + rowH)
        .stroke()
        .restore();

      let x = startX;
      cells.forEach((t, i) => {
        doc
          .fillColor(TEXT)
          .font("Helvetica")
          .fontSize(8)
          .text(t, x + padX, top + padY, { width: (colW[i] ?? 0) - padX * 2 });
        x += colW[i] ?? 0;
      });
      doc.y = top + rowH;
    });
  }

  // Rodapé X/N
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const origBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const h = doc.page.height;
    doc
      .save()
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        "Documento gerado pelo Sistema CFO Alunos · CBMAP — Uso interno. Pel.=Pelotão · Sx=Sexo · AP=Reside no Amapá · Mil.=Exp. militar · PM=Pendência material · PD=Pendência documento.",
        startX,
        h - 24,
        { width: usableW - 80, lineBreak: false, ellipsis: true },
      )
      .text(`${i + 1}/${range.count}`, startX + usableW - 80, h - 24, {
        width: 80,
        align: "right",
        lineBreak: false,
      })
      .restore();
    doc.page.margins.bottom = origBottom;
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.role !== "coordenacao" && session.role !== "secretaria") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const format = (req.nextUrl.searchParams.get("format") ?? "pdf").toLowerCase();
  if (format !== "pdf" && format !== "xlsx") {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? (body.ids.filter((x) => typeof x === "string") as string[])
    : [];
  const criterios = Array.isArray(body.criterios)
    ? (body.criterios.filter((x) => typeof x === "string") as string[])
    : ["Nenhum filtro aplicado (turma inteira)"];

  // Dados sensíveis (saúde) só para Coordenação — independente do que o cliente pediu.
  const includeSensitive = body.includeSensitive === true && session.role === "coordenacao";

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("students")
    .select(STUDENT_SELECT_COLUMNS)
    .is("deleted_at", null);
  if (ids.length > 0) query = query.in("id", ids);
  const { data, error } = await query.order("student_number", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const raw = (data ?? []) as Omit<
    AlunoFiltravel,
    "has_pending_equipment" | "has_pending_documents"
  >[];
  const studentIds = raw.map((s) => s.id);

  // Pendências (em uma única ida ao banco, restrita aos alunos filtrados)
  const [pendEquipRes, pendDocsRes] =
    studentIds.length > 0
      ? await Promise.all([
          supabase
            .from("student_equipment_status")
            .select("student_id, status")
            .in("student_id", studentIds)
            .in("status", PENDING_EQUIPMENT_STATUS as unknown as string[]),
          supabase
            .from("documents")
            .select("student_id, status")
            .in("student_id", studentIds)
            .in("status", PENDING_DOC_STATUS as unknown as string[]),
        ])
      : [{ data: [] as { student_id: string }[] }, { data: [] as { student_id: string }[] }];

  const pendEquipSet = new Set<string>(
    (pendEquipRes.data ?? []).map((r) => (r as any).student_id).filter(Boolean),
  );
  const pendDocsSet = new Set<string>(
    (pendDocsRes.data ?? []).map((r) => (r as any).student_id).filter(Boolean),
  );

  let alunos: AlunoFiltravel[] = raw.map((s) => ({
    ...s,
    has_pending_equipment: pendEquipSet.has(s.id),
    has_pending_documents: pendDocsSet.has(s.id),
  }));

  // Se a sessão não é Coordenação, zera dados sensíveis nas linhas (defesa em profundidade)
  if (session.role !== "coordenacao") {
    alunos = alunos.map((a) => ({ ...a, health_restrictions: null, religion: null }));
  }

  try {
    const buffer =
      format === "xlsx"
        ? await buildXlsx(alunos, criterios, includeSensitive)
        : await buildPdf(alunos, criterios, includeSensitive);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `${FILENAME_BASE}_${date}.${format}`;
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
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[reports/filtros-avancados] erro:", detail);
    return NextResponse.json(
      { error: "Falha ao gerar relatório", detail },
      { status: 500 },
    );
  }
}
