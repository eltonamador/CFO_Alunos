import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { macapaDate, shiftQtsDate, type QtsSnapshot } from "../domain/qts";
import type { QtsDatabase, QtsDocumentRow } from "./qtsDatabase";

function validRange(start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start)
    throw new Error("Período de consulta inválido.");
  if (shiftQtsDate(start, 31) < end) throw new Error("Selecione um período de até 31 dias.");
}

async function signedDocuments(client: SupabaseClient<QtsDatabase>, documents: QtsDocumentRow[]) {
  return Promise.all(
    documents.map(async (document) => {
      const signed = await client.storage
        .from("schedule-pdfs")
        .createSignedUrl(document.storage_path, 3600, { download: document.original_filename });
      return {
        id: document.id,
        periodStart: document.period_start,
        periodEnd: document.period_end,
        originalFilename: document.original_filename,
        downloadUrl: signed.data?.signedUrl ?? null,
      };
    }),
  );
}

export async function getQtsCalendar(start: string, end: string): Promise<QtsSnapshot> {
  validRange(start, end);
  const session = await getSession();
  if (!session?.active || session.isFirstAccess) throw new Error("Sessão ativa necessária.");
  const client = createSupabaseServerClient() as SupabaseClient<QtsDatabase>;
  const [activities, documents] = await Promise.all([
    client.rpc("qts_calendar", { p_start: start, p_end: end }),
    client.rpc("qts_published_documents", { p_start: start, p_end: end }),
  ]);
  if (activities.error || documents.error) throw new Error("Não foi possível carregar o QTS agora.");
  return {
    version: 1,
    userId: session.userId,
    start,
    end,
    savedAt: new Date().toISOString(),
    entries: (activities.data ?? []).map((row) => ({
      id: row.id,
      documentId: row.document_id,
      date: row.activity_date,
      sequence: row.sequence,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      activity: row.activity,
      instructor: row.instructor,
      workload: row.workload,
      uniform: row.uniform,
      location: row.location,
      isBreak: row.is_break,
      originalFilename: row.original_filename,
    })),
    documents: await signedDocuments(client, documents.data ?? []),
  };
}

export async function getQtsOverview() {
  const today = macapaDate();
  return getQtsCalendar(today, shiftQtsDate(today, 1));
}

export async function getQtsPublicationOptions() {
  const client = createSupabaseServerClient();
  const [classes, type] = await Promise.all([
    client.from("classes").select("id,name").order("name"),
    client.from("schedule_types").select("id").eq("code", "qts").maybeSingle(),
  ]);
  if (classes.error || type.error || !type.data)
    throw new Error("Não foi possível preparar a publicação do QTS.");
  return {
    classes: classes.data ?? [],
    qtsTypeId: type.data.id,
  };
}
