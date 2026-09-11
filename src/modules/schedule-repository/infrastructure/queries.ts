import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import type {
  ScheduleClass,
  ScheduleDocument,
  ScheduleDocumentView,
  ScheduleFilters,
  ScheduleRepositoryData,
  ScheduleProcessingRun,
  ScheduleType,
} from "../application/types";

export class ScheduleRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduleRepositoryError";
  }
}

function scheduleError(error: { code?: string; message?: string }) {
  if (["42P01", "PGRST202", "PGRST205"].includes(error.code ?? "")) {
    return new ScheduleRepositoryError(
      "O repositório de escalas aguarda a instalação das migrations no ambiente atual.",
    );
  }
  return new ScheduleRepositoryError("Não foi possível carregar o repositório de escalas.");
}

export async function getScheduleRepository(
  filters: ScheduleFilters = {},
): Promise<ScheduleRepositoryData> {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess) {
    throw new ScheduleRepositoryError("Sessão inválida para consultar escalas.");
  }
  const supabase = createSupabaseServerClient();
  let documentQuery = supabase
    .from("schedule_documents")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (filters.turma) documentQuery = documentQuery.eq("class_id", filters.turma);
  if (filters.tipo) documentQuery = documentQuery.eq("schedule_type_id", filters.tipo);
  if (filters.situacao) documentQuery = documentQuery.eq("publication_status", filters.situacao);
  if (filters.inicio) documentQuery = documentQuery.gte("period_end", filters.inicio);
  if (filters.fim) documentQuery = documentQuery.lte("period_start", filters.fim);

  const [documentsResponse, typesResponse, classesResponse] = await Promise.all([
    documentQuery,
    supabase.from("schedule_types").select("*").order("active", { ascending: false }).order("name"),
    supabase.from("classes").select("id,name").order("name"),
  ]);
  const firstError = documentsResponse.error ?? typesResponse.error ?? classesResponse.error;
  if (firstError) throw scheduleError(firstError);

  const types = (typesResponse.data ?? []) as ScheduleType[];
  const classes = (classesResponse.data ?? []) as ScheduleClass[];
  const rawDocuments = (documentsResponse.data ?? []) as ScheduleDocument[];
  const documentIds = rawDocuments.map((document) => document.id);
  let runs: ScheduleProcessingRun[] = [];
  let reviewCounts = new Map<string, number>();
  if (session.role === "coordenacao" && documentIds.length) {
    const [runsResponse, candidatesResponse] = await Promise.all([
      supabase
        .from("schedule_processing_runs")
        .select("*")
        .in("document_id", documentIds)
        .order("attempt", { ascending: false }),
      supabase
        .from("schedule_candidates")
        .select("document_id")
        .in("document_id", documentIds)
        .in("match_status", ["needs_review", "not_found"]),
    ]);
    const processingError = runsResponse.error ?? candidatesResponse.error;
    if (processingError) throw scheduleError(processingError);
    runs = (runsResponse.data ?? []) as ScheduleProcessingRun[];
    reviewCounts = (candidatesResponse.data ?? []).reduce((counts, candidate) => {
      counts.set(candidate.document_id, (counts.get(candidate.document_id) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
  }
  const documents: ScheduleDocumentView[] = await Promise.all(
    rawDocuments.map(async (document) => {
      let downloadUrl: string | null = null;
      if (document.publication_status === "published") {
        const { data } = await supabase.storage
          .from("schedule-pdfs")
          .createSignedUrl(document.storage_path, 60 * 10);
        downloadUrl = data?.signedUrl ?? null;
      }
      return {
        ...document,
        class_name: classes.find((item) => item.id === document.class_id)?.name ?? "Turma",
        schedule_type_name:
          types.find((item) => item.id === document.schedule_type_id)?.name ?? "Tipo de escala",
        download_url: downloadUrl,
        latest_run: runs.find((run) => run.document_id === document.id) ?? null,
        review_count: reviewCounts.get(document.id) ?? 0,
      };
    }),
  );
  return { documents, types, classes };
}

export async function getScheduleTypes(): Promise<ScheduleType[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_types")
    .select("*")
    .order("active", { ascending: false })
    .order("name");
  if (error) throw scheduleError(error);
  return (data ?? []) as ScheduleType[];
}
