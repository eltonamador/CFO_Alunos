import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database, Json } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseScheduleText, SCHEDULE_PARSER_REVISION } from "../domain/parser";
import { extractSchedulePdfText, ScheduleExtractionError } from "./pdfText";
import { extractOfficerSchedulePdf } from "./officerPdf";

interface ClaimedRun {
  run_id: string;
  document_id: string;
  class_id: string;
  storage_path: string;
  schedule_type_name: string;
  period_start: string | null;
  method: "auto" | "native_text" | "ocr";
  attempt: number;
}

type AdminClient = SupabaseClient<Database>;

async function finishFailure(client: AdminClient, runId: string, error: unknown) {
  const known = error instanceof ScheduleExtractionError;
  const code = known ? error.code : "PROCESSING_FAILED";
  const message = error instanceof Error ? error.message : "Falha inesperada no processamento.";
  const { error: finishError } = await client.rpc("schedule_complete_processing_run", {
    p_run_id: runId,
    p_status: "failed",
    p_metrics: {},
    p_candidates: [],
    p_error_code: code,
    p_error_message: message.slice(0, 2000),
  });
  if (finishError) throw new Error(`Falha ao registrar erro do parser: ${finishError.message}`);
  return { status: "failed" as const, runId, errorCode: code };
}

async function processClaimedSchedule(client: AdminClient, run: ClaimedRun) {
  try {
    const download = await client.storage.from("schedule-pdfs").download(run.storage_path);
    if (download.error || !download.data) {
      throw new Error(`Falha ao baixar PDF: ${download.error?.message ?? "arquivo ausente"}`);
    }
    const pdfBytes = new Uint8Array(await download.data.arrayBuffer());
    const extracted = await extractSchedulePdfText(
      pdfBytes,
      run.method,
      env.SCHEDULE_OCR_PROVIDER,
      env.SCHEDULE_OCR_LANGUAGE,
    );
    const students = await client
      .from("students")
      .select("id,student_number,full_name,war_name")
      .eq("class_id", run.class_id)
      .is("deleted_at", null)
      .eq("course_status", "matriculado");
    if (students.error) throw new Error(`Falha ao carregar cadetes: ${students.error.message}`);

    const parsed = parseScheduleText(
      extracted.text,
      (students.data ?? []).map((student) => ({
        id: student.id,
        studentNumber: student.student_number,
        fullName: student.full_name,
        warName: student.war_name,
      })),
      {
        referenceYear: run.period_start
          ? Number(run.period_start.slice(0, 4))
          : new Date().getUTCFullYear(),
        defaultDutyFunction: run.schedule_type_name,
      },
    );
    let officerEntries: Awaited<ReturnType<typeof extractOfficerSchedulePdf>> = [];
    if (run.schedule_type_name.toLowerCase().includes("oficial de dia")) {
      const identities = await client
        .from("cfo_coordination_members")
        .select("service_alias,profile_id")
        .eq("active", true)
        .not("service_alias", "is", null);
      if (identities.error) throw new Error(`Falha ao carregar oficiais: ${identities.error.message}`);
      officerEntries = await extractOfficerSchedulePdf(
        pdfBytes,
        (identities.data ?? []).flatMap((identity) =>
          identity.service_alias
            ? [{ serviceAlias: identity.service_alias, profileId: identity.profile_id }]
            : [],
        ),
      );
      if (officerEntries.length) {
        const inserted = await client.from("schedule_officer_assignments").insert(
          officerEntries.map((entry) => ({
            ...entry,
            run_id: run.run_id,
            document_id: run.document_id,
          })),
        );
        if (inserted.error) throw new Error(`Falha ao registrar escala ODA: ${inserted.error.message}`);
      }
    }
    const resultStatus = officerEntries.length && parsed.metrics.reviewCount === 0
      ? "succeeded"
      : parsed.status;
    const metrics = {
      ...parsed.metrics,
      officerCount: officerEntries.length,
      pages: extracted.pages,
      extractedCharacters: extracted.text.length,
      extractionMethod: extracted.extractionMethod,
      extractedText: extracted.text.slice(0, 100_000),
      extractedTextTruncated: extracted.text.length > 100_000,
    };
    const { error: completionError } = await client.rpc("schedule_complete_processing_run", {
      p_run_id: run.run_id,
      p_status: resultStatus,
      p_metrics: metrics,
      p_candidates: parsed.candidates as unknown as Json,
    });
    if (completionError)
      throw new Error(`Falha ao concluir processamento: ${completionError.message}`);
    return { status: resultStatus, runId: run.run_id, metrics };
  } catch (error) {
    return finishFailure(client, run.run_id, error);
  }
}

export async function processNextSchedule() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc("schedule_claim_processing_run", {
    p_parser_revision: SCHEDULE_PARSER_REVISION,
  });
  if (error) throw new Error(`Falha ao obter item da fila: ${error.message}`);
  const run = (data?.[0] ?? null) as ClaimedRun | null;
  return run ? processClaimedSchedule(client, run) : null;
}

/** Processa a solicitação recém-criada sem depender do cron diário. */
export async function processScheduleDocumentNow(documentId: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc("schedule_claim_processing_run_for_document", {
    p_document_id: documentId,
    p_parser_revision: SCHEDULE_PARSER_REVISION,
  });
  if (error) throw new Error(`Falha ao iniciar o processamento imediato: ${error.message}`);
  const run = (data?.[0] ?? null) as ClaimedRun | null;
  return run ? processClaimedSchedule(client, run) : null;
}
