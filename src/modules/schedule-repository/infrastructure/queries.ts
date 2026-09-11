import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import type {
  ScheduleClass,
  ScheduleAssignmentView,
  ScheduleDocument,
  ScheduleDocumentView,
  ScheduleFilters,
  ScheduleRepositoryData,
  ScheduleReviewCandidateView,
  ScheduleStudentOption,
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
  let reviewCandidates: ScheduleReviewCandidateView[] = [];
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

    const pending = await supabase
      .from("schedule_candidates")
      .select("*")
      .in("document_id", documentIds)
      .in("match_status", ["needs_review", "not_found"])
      .order("created_at")
      .order("sequence");
    if (pending.error) throw scheduleError(pending.error);
    const classIds = [
      ...new Set(
        (pending.data ?? [])
          .map(
            (candidate) => rawDocuments.find((item) => item.id === candidate.document_id)?.class_id,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    let students: ScheduleStudentOption[] = [];
    if (classIds.length) {
      const response = await supabase
        .from("students")
        .select("id,class_id,student_number,war_name,full_name")
        .in("class_id", classIds)
        .is("deleted_at", null)
        .order("student_number");
      if (response.error) throw scheduleError(response.error);
      students = response.data ?? [];
    }
    reviewCandidates = (pending.data ?? []).flatMap((candidate) => {
      const document = rawDocuments.find((item) => item.id === candidate.document_id);
      if (!document || document.processing_status === "superseded") return [];
      return [
        {
          ...candidate,
          class_id: document.class_id,
          class_name: classes.find((item) => item.id === document.class_id)?.name ?? "Turma",
          document_name: document.original_filename,
          students: students.filter((student) => student.class_id === document.class_id),
        },
      ];
    });
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
  let assignments: ScheduleAssignmentView[] = [];
  if (session.role === "aluno") {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Belem" });
    const response = await supabase
      .from("schedule_assignments")
      .select("*")
      .eq("status", "published")
      .gte("duty_date", today)
      .order("duty_date")
      .order("published_at");
    if (response.error) throw scheduleError(response.error);
    assignments = (response.data ?? []).map((assignment) => {
      const document = rawDocuments.find((item) => item.id === assignment.document_id);
      const type = types.find((item) => item.id === document?.schedule_type_id);
      return {
        ...assignment,
        schedule_type_name: type?.name ?? "Escala",
        document_name: document?.original_filename ?? "Documento oficial",
      };
    });
  }
  return { documents, types, classes, reviewCandidates, assignments };
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

export async function getUpcomingScheduleAssignments(limit = 6): Promise<ScheduleAssignmentView[]> {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess || session.role !== "aluno" || !session.studentId) {
    return [];
  }
  const supabase = createSupabaseServerClient();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Belem" });
  const assignments = await supabase
    .from("schedule_assignments")
    .select("*")
    .eq("status", "published")
    .gte("duty_date", today)
    .order("duty_date")
    .limit(limit);
  if (assignments.error || !assignments.data?.length) return [];
  const documentIds = [...new Set(assignments.data.map((item) => item.document_id))];
  const documents = await supabase
    .from("schedule_documents")
    .select("id,schedule_type_id,original_filename")
    .in("id", documentIds);
  if (documents.error) return [];
  const typeIds = [...new Set((documents.data ?? []).map((item) => item.schedule_type_id))];
  const types = typeIds.length
    ? await supabase.from("schedule_types").select("id,name").in("id", typeIds)
    : { data: [], error: null };
  if (types.error) return [];
  return assignments.data.map((assignment) => {
    const document = (documents.data ?? []).find((item) => item.id === assignment.document_id);
    return {
      ...assignment,
      schedule_type_name:
        (types.data ?? []).find((item) => item.id === document?.schedule_type_id)?.name ?? "Escala",
      document_name: document?.original_filename ?? "Documento oficial",
    };
  });
}
