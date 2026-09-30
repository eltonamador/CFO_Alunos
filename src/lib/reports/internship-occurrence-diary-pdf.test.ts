// @vitest-environment node
import { describe, expect, it } from "vitest";
import { diaryBadges, type DiaryEntry } from "@/modules/internship-management/domain/occurrenceDiary";
import { buildOccurrenceDiaryPDF, pdfSafe } from "./internship-occurrence-diary-pdf";

async function pdfText(buffer: Buffer) {
  const { ensurePdfRuntime } = await import("@/modules/schedule-repository/infrastructure/pdfText");
  const { extractText, getDocumentProxy } = await import("unpdf");
  await ensurePdfRuntime();
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  try {
    const result = await extractText(doc);
    return { text: result.text.join("\n"), pages: result.totalPages };
  } finally {
    await doc.destroy();
  }
}

const entry = (fields: Partial<DiaryEntry>): DiaryEntry => ({
  id: "e1",
  student_id: "s1",
  assignment_id: null,
  status: "pessoal",
  occurred_on: "2026-09-26",
  summary: "Registro",
  occurrence_type: null,
  other_type: null,
  severity: null,
  participation: null,
  vehicle: null,
  perception: null,
  description: null,
  companion_ids: [],
  protocol_number: null,
  shared_at: null,
  featured_at: null,
  hidden_at: null,
  hidden_reason: null,
  created_at: "2026-09-26T12:00:00Z",
  updated_at: "2026-09-26T12:00:00Z",
  ...fields,
});

describe("PDF pessoal do diário", () => {
  it("remove emojis e mantém acentos e travessões", () => {
    expect(pdfSafe("Salvamento 👏 na praia — vítima consciente  ")).toBe(
      "Salvamento na praia — vítima consciente",
    );
  });

  it("gera a lembrança com resumo, aviso extraoficial e cada relato", async () => {
    const entries = [
      entry({
        id: "e1",
        summary: "Queda de moto 🚑 na BR-210",
        occurrence_type: "aph",
        severity: "moderada",
        participation: "apoiei",
        vehicle: "USB-12",
        assignment_id: "a1",
        perception: "Aprendi a importância da imobilização.",
        companion_ids: ["s2"],
        protocol_number: "2026-001",
        status: "compartilhado",
        shared_at: "2026-09-26T13:00:00Z",
        featured_at: "2026-09-26T14:00:00Z",
      }),
      entry({
        id: "e2",
        occurred_on: "2026-10-02",
        summary: "Afogamento evitado no Araxá",
        occurrence_type: "salvamento_aquatico",
        description: "Relato longo. ".repeat(400),
      }),
    ];
    const totals = new Map([["e1", 3]]);
    const pdf = await buildOccurrenceDiaryPDF({
      cadet: "SILVA · 07",
      entries,
      shiftLabels: new Map([["a1", "26/09 07:45 · USB—APH · 1º GBM"]]),
      names: new Map([["s2", "COLEGA · 02"]]),
      reactionTotals: totals,
      badges: diaryBadges(entries, totals),
      issuedAt: "2026-10-03T12:00:00Z",
    });
    const { text, pages } = await pdfText(pdf);
    const flat = text.replace(/\s+/g, " ");
    expect(pages).toBeGreaterThan(1);
    for (const expected of [
      "Meu diário de ocorrências",
      "SILVA · 07",
      "2 registros de 26/09/2026 a 02/10/2026 · 2 tipos diferentes · 1 no mural da turma",
      "Insígnias: Primeiro registro · Primeiro APH · Primeiro salvamento aquático",
      "não conta horas e não é avaliação",
      "Queda de moto na BR-210",
      "26/09 07:45 · USB—APH · 1º GBM · APH (atendimento pré-hospitalar) · Moderada · Apoiei · Viatura USB-12",
      "Com COLEGA · 02 · Ocorrência nº 2026-001 · Compartilhado no mural · 3 reações · Destaque da Coordenação",
      "Afogamento evitado no Araxá",
      `página 1 de ${pages}`,
    ])
      expect(flat).toContain(expected);
    expect(flat).not.toContain("🚑");
  });
});
