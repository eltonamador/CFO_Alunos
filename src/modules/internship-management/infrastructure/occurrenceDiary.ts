import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DiaryEntry, DiaryShift, ReactionRow } from "../domain/occurrenceDiary";
import { readAll } from "./readAll";

type Db = ReturnType<typeof createSupabaseServerClient>;
export type Cadet = { id: string; war_name: string; student_number: number | null };

export function cadetLabel(cadet: Cadet | undefined): string {
  if (!cadet) return "Cadete";
  return cadet.student_number == null
    ? cadet.war_name
    : `${cadet.war_name} · ${String(cadet.student_number).padStart(2, "0")}`;
}

/** Nome de guerra e número apenas: a mesma projeção da lista básica da turma. */
export async function loadCadets(db: Db, ids: string[]): Promise<Map<string, Cadet>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await db
    .from("v_student_class_basic")
    .select("id,war_name,student_number")
    .in("id", unique);
  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        war_name: (row.war_name as string) ?? "Cadete",
        student_number: row.student_number ?? null,
      },
    ]),
  );
}

export async function loadClassmates(db: Db, studentId: string): Promise<Cadet[]> {
  const { data: me } = await db
    .from("students")
    .select("class_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!me?.class_id) return [];
  const { data } = await db
    .from("v_student_class_basic")
    .select("id,war_name,student_number")
    .eq("class_id", me.class_id)
    .order("student_number", { ascending: true });
  return (data ?? [])
    .filter((row) => row.id !== studentId)
    .map((row) => ({
      id: row.id as string,
      war_name: (row.war_name as string) ?? "Cadete",
      student_number: row.student_number ?? null,
    }));
}

/** Em lotes, para a lista de relatos não estourar o tamanho da URL da API. */
export async function loadReactions(db: Db, entryIds: string[]): Promise<ReactionRow[]> {
  const chunks: string[][] = [];
  for (let start = 0; start < entryIds.length; start += 100)
    chunks.push(entryIds.slice(start, start + 100));
  const results = await Promise.all(
    chunks.map((ids) =>
      db.from("internship_diary_reactions").select("entry_id,user_id,kind").in("entry_id", ids),
    ),
  );
  return results.flatMap((result) => result.data ?? []);
}

export type SharedEntry = Pick<
  DiaryEntry,
  | "id"
  | "student_id"
  | "occurrence_type"
  | "occurrence_types"
  | "summary"
  | "featured_at"
  | "shared_at"
>;

/** Todos os relatos visíveis no mural da turma, para o quadro e os destaques. */
export async function loadSharedEntries(db: Db): Promise<SharedEntry[]> {
  return readAll((from, to) =>
    db
      .from("internship_diary_entries")
      .select("id,student_id,occurrence_type,occurrence_types,summary,featured_at,shared_at")
      .eq("status", "compartilhado")
      .is("hidden_at", null)
      .order("shared_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
}

export async function loadDiaryShifts(db: Db): Promise<DiaryShift[]> {
  const { data } = await db.rpc("internship_my_shifts");
  return (data ?? []).map((shift) => ({
    assignment_id: shift.assignment_id,
    activity_code: shift.activity_code,
    activity_name: shift.activity_name,
    site_name: shift.site_name,
    starts_at: shift.starts_at,
    ends_at: shift.ends_at,
  }));
}

export async function loadMyVehicles(db: Db, studentId: string): Promise<string[]> {
  const { data } = await db
    .from("internship_diary_entries")
    .select("vehicle,vehicles")
    .eq("student_id", studentId)
    .not("vehicle", "is", null)
    .limit(200);
  return [
    ...new Set([
      "USB",
      "AR",
      "ABT",
      "SB",
      ...(data ?? []).flatMap((row) =>
        row.vehicles?.length ? row.vehicles : row.vehicle ? [row.vehicle] : [],
      ),
    ]),
  ];
}
