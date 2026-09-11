import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database, Json } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseScheduleText, SCHEDULE_PARSER_REVISION } from "../domain/parser";
import { extractSchedulePdfText, ScheduleExtractionError } from "./pdfText";

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

export async function processNextSchedule() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc("schedule_claim_processing_run", {
    p_parser_revision: SCHEDULE_PARSER_REVISION,
  });
  if (error) throw new Error(`Falha ao obter item da fila: ${error.message}`);
  const run = (data?.[0] ?? null) as ClaimedRun | null;
  if (!run) return null;

  try {
    const download = await client.storage.from("schedule-pdfs").download(run.storage_path);
    if (download.error || !download.data) {
      throw new Error(`Falha ao baixar PDF: ${download.error?.message ?? "arquivo ausente"}`);
    }
    const extracted = await extractSchedulePdfText(
      new Uint8Array(await download.data.arrayBuffer()),
      run.method,
      env.SCHEDULE_OCR_PROVIDER,
      env.SCHEDULE_OCR_LANGUAGE,
    );
    const students = await client
      .from("students")
      .select("id,student_number,full_name,war_name")
      .eq("class_id", run.class_id)
      .is("deleted_at", null);
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
    const metrics = {
      ...parsed.metrics,
      pages: extracted.pages,
      extractedCharacters: extracted.text.length,
      extractionMethod: extracted.extractionMethod,
    };
    const { error: completionError } = await client.rpc("schedule_complete_processing_run", {
      p_run_id: run.run_id,
      p_status: parsed.status,
      p_metrics: metrics,
      p_candidates: parsed.candidates as unknown as Json,
    });
    if (completionError)
      throw new Error(`Falha ao concluir processamento: ${completionError.message}`);
    return { status: parsed.status, runId: run.run_id, metrics };
  } catch (error) {
    return finishFailure(client, run.run_id, error);
  }
}
