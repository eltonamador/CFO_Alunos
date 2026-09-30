// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import {
  scaleSnapshot,
  sameScaleSnapshot,
  scaleChangeSummary,
  archivedPdfResponse,
  issueVersionedScale,
  correctIssuedScale,
  discardIssuedScale,
  ScaleCorrectionError,
  type ArchivedScale,
} from "./internship-scale-revisions";
import type { OperationalInternshipScaleDraft } from "./internship-operational-scale";
const draft: OperationalInternshipScaleDraft = {
  programId: "p",
  programName: "CFO",
  service: "gbm",
  gbmName: "1º GBM",
  periodStart: "2026-09-26",
  periodEnd: "2026-09-27",
  issuedAt: "2026-09-25T12:00:00Z",
  rows: [
    {
      shiftId: "s",
      studentNumber: 1,
      warName: "CADETE A",
      activityName: "USB",
      siteName: "1º GBM",
      resourceName: "USB",
      startsAt: "2026-09-26T22:45:00Z",
      endsAt: "2026-09-27T10:45:00Z",
      uniformCode: "3A",
      validatedMinutes: 0,
    },
  ],
};
describe("retificações de PDF", () => {
  it("ignora horário de download, ordem das chaves e ordem da consulta, preservando reimpressão", () => {
    const row = { ...draft.rows[0]!, studentNumber: 2 };
    const a = scaleSnapshot({ ...draft, rows: [row, ...draft.rows] }, "coordenador");
    const b = scaleSnapshot(
      { ...draft, issuedAt: new Date().toISOString(), rows: [...draft.rows, row] },
      "coordenador",
    );
    expect(sameScaleSnapshot(JSON.parse(JSON.stringify(a)), b)).toBe(true);
  });
  it("identifica troca de cadete, horário, uniforme, assinatura e homologação", () => {
    const a = scaleSnapshot(draft, "coordenador");
    for (const field of [
      { warName: "OUTRO" },
      { startsAt: "2026-09-26T23:45:00Z" },
      { uniformCode: "4D" as const },
      { validatedMinutes: 60 },
    ])
      expect(
        sameScaleSnapshot(
          a,
          scaleSnapshot({ ...draft, rows: [{ ...draft.rows[0]!, ...field }] }, "coordenador"),
        ),
      ).toBe(false);
    const b = scaleSnapshot(
      { ...draft, rows: [{ ...draft.rows[0]!, studentNumber: 2, warName: "CADETE B" }] },
      "supervisor",
    );
    expect(scaleChangeSummary(a, b)).toContain("1 inclusão(ões); 1 retirada(s); signatário");
    expect(scaleChangeSummary(a, scaleSnapshot({ ...draft, rows: [] }, "coordenador"))).toContain(
      "Sem participações",
    );
  });
  it("devolve exatamente os bytes arquivados com número e retificação no arquivo", async () => {
    const original = Buffer.from("%PDF-arquivo original");
    const archive = {
      revision: 3,
      rectification: 2,
      pdf_base64: original.toString("base64"),
    } as ArchivedScale;
    const response = archivedPdfResponse(archive, "12-26092026", true);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(original);
    expect(response.headers.get("content-disposition")).toContain(
      'filename="escala-12-26092026-retificacao-02.pdf"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const clean = archivedPdfResponse({ ...archive, rectification: null }, "01-26092026");
    expect(clean.headers.get("content-disposition")).toContain('filename="escala-01-26092026.pdf"');
  });
  it("não registra observação de emissão inicial", () => {
    expect(scaleChangeSummary(undefined, scaleSnapshot(draft, "coordenador"))).not.toMatch(
      /Primeira emissão|inicial/i,
    );
  });
  it("reimpressão reutiliza arquivo sem inserir nova versão", async () => {
    const archive = {
      id: "a",
      revision: 0,
      snapshot: scaleSnapshot(draft, "coordenador"),
      pdf_base64: Buffer.from("%PDF").toString("base64"),
    } as ArchivedScale;
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const from = vi.fn((table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        is: () => q,
        order: () => q,
        limit: () => q,
        single: async () => ({ data: { id: "n" }, error: null }),
        maybeSingle: async () => ({
          data: table === "internship_scale_revisions" ? archive : issuedNumber,
          error: null,
        }),
      };
      return q;
    });
    expect((await issueVersionedScale({ rpc, from } as never, draft, "coordenador")).archive).toBe(
      archive,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0]![0]).toBe("internship_issue_scale_number");
  });
});

const issuedNumber = { id: "n", sequence_number: 1, period_start: "2026-09-26" };
// Banco simulado: numeração emitida, última versão e captura das chamadas RPC.
function fakeDb(previous: ArchivedScale | null, number: typeof issuedNumber | null = issuedNumber) {
  const rpc = vi.fn(async (name: string, _args?: unknown) => ({
    data:
      name === "internship_issue_scale_number"
        ? 1
        : name === "internship_void_scale_number"
          ? null
          : "nova",
    error: null,
  }));
  const from = vi.fn((table: string) => {
    const q: any = {
      select: () => q,
      eq: () => q,
      is: () => q,
      order: () => q,
      limit: () => q,
      maybeSingle: async () => ({
        data: table === "internship_scale_revisions" ? previous : number,
        error: null,
      }),
      single: async () => ({ data: { id: "nova", revision: 9 }, error: null }),
    };
    return q;
  });
  return { db: { rpc, from } as never, rpc };
}
async function pdfText(base64: string) {
  const { ensurePdfRuntime } = await import("@/modules/schedule-repository/infrastructure/pdfText");
  const { extractText, getDocumentProxy } = await import("unpdf");
  await ensurePdfRuntime();
  const doc = await getDocumentProxy(new Uint8Array(Buffer.from(base64, "base64")));
  try {
    return (await extractText(doc)).text.join("\n");
  } finally {
    await doc.destroy();
  }
}
const archived = (fields: Partial<ArchivedScale>) =>
  ({
    id: "v",
    revision: 0,
    rectification: null,
    snapshot: scaleSnapshot(draft, "coordenador"),
    pdf_base64: "",
    ...fields,
  }) as ArchivedScale;

describe("emissão e correção de escalas", () => {
  it("primeira emissão sai numerada como 01 e sem observação de emissão inicial", async () => {
    const { db, rpc } = fakeDb(null);
    const { referenceCode } = await issueVersionedScale(db, draft, "coordenador");
    expect(referenceCode).toBe("01-26092026");
    const [, args] = rpc.mock.calls.find(([name]) => name === "internship_archive_scale_version")!;
    expect(args).toMatchObject({
      p_mode: "automatica",
      p_rectification: null,
      p_expected_revision: -1,
    });
    const text = await pdfText((args as any).p_pdf_base64);
    expect(text).toContain("Escala nº 01-26092026");
    expect(text).not.toMatch(/EMISSÃO INICIAL|Primeira emissão|RETIFICAÇÃO/);
  });
  it("corrige escala ainda não divulgada sem retificação, mesmo sem mudança de dados", async () => {
    const { db, rpc } = fakeDb(archived({ revision: 0 }));
    await correctIssuedScale(db, draft, "coordenador", {}, "correcao", "  Ajuste antes do envio  ");
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0]!;
    expect(name).toBe("internship_archive_scale_version");
    expect(args).toMatchObject({
      p_mode: "correcao",
      p_rectification: null,
      p_expected_revision: 0,
      p_summary: "Ajuste antes do envio",
    });
    expect(await pdfText((args as any).p_pdf_base64)).not.toMatch(/RETIFICAÇÃO|EMISSÃO INICIAL/);
  });
  it("retifica escala já divulgada mantendo o número", async () => {
    const { db, rpc } = fakeDb(archived({ revision: 2, rectification: 1 }));
    const { referenceCode } = await correctIssuedScale(
      db,
      draft,
      "supervisor",
      {},
      "retificacao",
      "Troca de cadete",
    );
    expect(referenceCode).toBe("01-26092026");
    const [, args] = rpc.mock.calls[0]!;
    expect(args).toMatchObject({
      p_mode: "retificacao",
      p_rectification: 2,
      p_expected_revision: 2,
    });
    expect(await pdfText((args as any).p_pdf_base64)).toContain("RETIFICAÇÃO 02 - Troca de cadete");
  });
  it("não corrige recorte sem escala emitida", async () => {
    const { db, rpc } = fakeDb(null, null);
    await expect(
      correctIssuedScale(db, draft, "coordenador", {}, "correcao", "Ajuste de teste"),
    ).rejects.toBeInstanceOf(ScaleCorrectionError);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("descarta emissão feita por engano pela função controlada", async () => {
    const { db, rpc } = fakeDb(archived({}));
    expect(await discardIssuedScale(db, draft, {}, " Emitida por engano ")).toBe("01-26092026");
    expect(rpc).toHaveBeenCalledWith("internship_void_scale_number", {
      p_scale_number_id: "n",
      p_reason: "Emitida por engano",
    });
  });
});

it("retificação da praia conserva cinco pontos e observações em uma página", async () => {
  const { PDFDocument } = await import("pdf-lib");
  const { buildOperationalInternshipPDF } = await import("./internship-operational-pdf");
  const scale = {
    ...draft,
    service: "praia" as const,
    gbmName: undefined,
    referenceCode: "01-27092026",
    rectification: 1,
    changeSummary: "Alterações: 1 inclusão(ões); 1 retirada(s); horários; uniformes; signatário",
    rows: ["Fazendinha", "Santa Inês", "Araxá", "Cidade Nova", "Curiaú"].map((siteName, i) => ({
      ...draft.rows[0]!,
      shiftId: String(i),
      studentNumber: i + 1,
      siteName,
      uniformCode: "4D" as const,
    })),
  };
  expect((await PDFDocument.load(await buildOperationalInternshipPDF(scale))).getPageCount()).toBe(
    1,
  );
});
