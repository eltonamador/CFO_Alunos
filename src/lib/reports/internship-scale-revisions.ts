/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildOperationalInternshipPDF,
  type InternshipScaleSignatory,
} from "./internship-operational-pdf";
import {
  formatInternshipScaleNumber,
  issueInternshipScaleNumber,
  type OperationalInternshipScaleDraft,
} from "./internship-operational-scale";

export type ScaleSnapshot = Omit<OperationalInternshipScaleDraft, "issuedAt"> & {
  signatory: InternshipScaleSignatory;
  layoutVersion: number;
};
export function scaleSnapshot(
  draft: OperationalInternshipScaleDraft,
  signatory: InternshipScaleSignatory,
): ScaleSnapshot {
  // Explicit properties and sorting make time of download / query ordering irrelevant.
  return {
    layoutVersion: 1,
    title: draft.title,
    gbmName: draft.gbmName,
    programId: draft.programId,
    programName: draft.programName,
    service: draft.service,
    periodStart: draft.periodStart,
    periodEnd: draft.periodEnd,
    signatory,
    rows: [...draft.rows].sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) ||
        a.siteName.localeCompare(b.siteName) ||
        a.shiftId.localeCompare(b.shiftId) ||
        a.studentNumber - b.studentNumber,
    ),
  };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const sameScaleSnapshot = (a: ScaleSnapshot, b: ScaleSnapshot) =>
  canonical(a) === canonical(b);
export function scaleChangeSummary(
  before: ScaleSnapshot | undefined,
  after: ScaleSnapshot,
): string {
  if (!before) return "Emissão da escala";
  if (!after.rows.length) return "Sem participações vigentes neste período";
  const changes: string[] = [];
  const key = (r: ScaleSnapshot["rows"][number]) => `${r.shiftId}:${r.studentNumber}`;
  const old = new Map(before.rows.map((r) => [key(r), r]));
  const current = new Map(after.rows.map((r) => [key(r), r]));
  const added = after.rows.filter((r) => !old.has(key(r))).length;
  const removed = before.rows.filter((r) => !current.has(key(r))).length;
  if (added) changes.push(`${added} inclusão(ões)`);
  if (removed) changes.push(`${removed} retirada(s)`);
  const fields = [
    ["startsAt", "endsAt", "horários"],
    ["siteName", "resourceName", "locais/recursos"],
    ["activityName", "activityName", "serviços"],
    ["uniformCode", "uniformCode", "uniformes"],
    ["warName", "warName", "nomes"],
    ["validatedMinutes", "validatedMinutes", "carga homologada"],
  ] as const;
  for (const [a, b, label] of fields)
    if (
      after.rows.some((r) => {
        const prev = old.get(key(r));
        return prev && (prev[a] !== r[a] || prev[b] !== r[b]);
      })
    )
      changes.push(label);
  if (before.signatory !== after.signatory) changes.push("signatário");
  if (before.layoutVersion !== after.layoutVersion) changes.push("apresentação do PDF");
  return `Alterações: ${changes.join("; ") || "identificação da escala"}`;
}
const pad = (value: number) => String(value).padStart(2, "0");
export type ScaleCorrectionMode = "correcao" | "retificacao";
export type ArchivedScale = {
  id: string;
  scale_number_id: string;
  revision: number;
  rectification: number | null;
  snapshot: ScaleSnapshot;
  change_summary: string;
  pdf_base64: string;
  issued_at: string;
};
type ScaleFilters = { gbmSiteId?: string; sourceRosterId?: string };
type IssuedScaleNumber = { id: string; sequence_number: number; period_start: string };
export class ScaleCorrectionError extends Error {}

async function findIssuedNumber(
  db: SupabaseClient<any, any, any>,
  draft: OperationalInternshipScaleDraft,
  filters: ScaleFilters,
): Promise<IssuedScaleNumber | null> {
  let query = db
    .from("internship_scale_numbers")
    .select("id,sequence_number,period_start")
    .is("voided_at", null)
    .eq("program_id", draft.programId)
    .eq("service", draft.service)
    .eq("period_start", draft.periodStart)
    .eq("period_end", draft.periodEnd);
  query = filters.gbmSiteId
    ? query.eq("gbm_site_id", filters.gbmSiteId)
    : query.is("gbm_site_id", null);
  query = filters.sourceRosterId
    ? query.eq("source_roster_id", filters.sourceRosterId)
    : query.is("source_roster_id", null);
  const result = await query.maybeSingle();
  if (result.error) throw new Error("Numeração da escala indisponível.");
  return (result.data as IssuedScaleNumber | null) ?? null;
}

async function latestVersion(
  db: SupabaseClient<any, any, any>,
  numberId: string,
): Promise<ArchivedScale | null> {
  const latest = await db
    .from("internship_scale_revisions")
    .select("*")
    .eq("scale_number_id", numberId)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) throw new Error("Falha ao consultar versões da escala.");
  return latest.data as ArchivedScale | null;
}

async function archiveVersion(
  db: SupabaseClient<any, any, any>,
  input: {
    numberId: string;
    referenceCode: string;
    draft: OperationalInternshipScaleDraft;
    signatory: InternshipScaleSignatory;
    previous: ArchivedScale | null;
    mode: "automatica" | ScaleCorrectionMode;
    summary: string;
  },
): Promise<ArchivedScale> {
  const { previous, mode } = input;
  // Correção antes da divulgação sai limpa; mudança automática e retificação numeram o PDF.
  const rectification = !previous || mode === "correcao" ? null : (previous.rectification ?? 0) + 1;
  const revision = (previous?.revision ?? -1) + 1;
  const issuedAt = new Date().toISOString();
  const pdf = await buildOperationalInternshipPDF(
    {
      ...input.draft,
      referenceCode: input.referenceCode,
      issuedAt,
      rectification,
      changeSummary: input.summary,
    },
    input.signatory,
  );
  const saved = await db.rpc("internship_archive_scale_version", {
    p_scale_number_id: input.numberId,
    p_expected_revision: revision - 1,
    p_snapshot: scaleSnapshot(input.draft, input.signatory),
    p_summary: input.summary,
    p_pdf_base64: pdf.toString("base64"),
    p_issued_at: issuedAt,
    p_mode: mode,
    p_rectification: rectification,
  });
  if (saved.error?.code === "40001")
    throw new Error(
      "A escala foi atualizada durante a emissão. Atualize a página e tente novamente.",
    );
  if (saved.error) throw new Error("Falha ao arquivar PDF da escala.");
  const result = await db
    .from("internship_scale_revisions")
    .select("*")
    .eq("id", saved.data)
    .single();
  if (result.error || !result.data) throw new Error("Versão arquivada indisponível.");
  return result.data as ArchivedScale;
}

export async function issueVersionedScale(
  db: SupabaseClient<any, any, any>,
  draft: OperationalInternshipScaleDraft,
  signatory: InternshipScaleSignatory,
  filters: ScaleFilters = {},
) {
  const referenceCode = await issueInternshipScaleNumber(db, { ...draft, ...filters });
  const number = await findIssuedNumber(db, draft, filters);
  if (!number) throw new Error("Numeração da escala indisponível.");
  const snapshot = scaleSnapshot(draft, signatory);
  const previous = await latestVersion(db, number.id);
  if (previous && sameScaleSnapshot(previous.snapshot, snapshot))
    return { archive: previous, referenceCode };
  const archive = await archiveVersion(db, {
    numberId: number.id,
    referenceCode,
    draft,
    signatory,
    previous,
    mode: "automatica",
    summary: scaleChangeSummary(previous?.snapshot, snapshot),
  });
  return { archive, referenceCode };
}

// Correção explícita de escala emitida: mantém o número e emite nova versão com os dados vigentes.
export async function correctIssuedScale(
  db: SupabaseClient<any, any, any>,
  draft: OperationalInternshipScaleDraft,
  signatory: InternshipScaleSignatory,
  filters: ScaleFilters,
  mode: ScaleCorrectionMode,
  reason: string,
) {
  const number = await findIssuedNumber(db, draft, filters);
  const previous = number ? await latestVersion(db, number.id) : null;
  if (!number || !previous) throw new ScaleCorrectionError("Nenhuma escala emitida neste recorte.");
  const referenceCode = formatInternshipScaleNumber(number.sequence_number, number.period_start);
  const archive = await archiveVersion(db, {
    numberId: number.id,
    referenceCode,
    draft,
    signatory,
    previous,
    mode,
    summary: reason.trim(),
  });
  return { archive, referenceCode };
}

// Emissão feita por engano: a escala deixa de valer e o número volta a ficar disponível.
export async function discardIssuedScale(
  db: SupabaseClient<any, any, any>,
  draft: OperationalInternshipScaleDraft,
  filters: ScaleFilters,
  reason: string,
) {
  const number = await findIssuedNumber(db, draft, filters);
  if (!number) throw new ScaleCorrectionError("Nenhuma escala emitida neste recorte.");
  const result = await db.rpc("internship_void_scale_number", {
    p_scale_number_id: number.id,
    p_reason: reason.trim(),
  });
  if (result.error) throw new Error("Não foi possível descartar a escala.");
  return formatInternshipScaleNumber(number.sequence_number, number.period_start);
}
export function archivedPdfResponse(
  archive: ArchivedScale,
  referenceCode: string,
  download = false,
) {
  return new Response(new Uint8Array(Buffer.from(archive.pdf_base64, "base64")), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="escala-${referenceCode.toLowerCase()}${archive.rectification ? `-retificacao-${pad(archive.rectification)}` : ""}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Scale-Revision": String(archive.revision),
    },
  });
}
