import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { dutyWindow } from "../domain/dutyWindow";

export interface DutyRosterEntry {
  id: string;
  kind: "cadet" | "officer";
  date: string;
  person: string;
  duty: string;
  mine: boolean;
}

const shiftLabel: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  diurno: "Diurno",
  noturno: "Noturno",
};

export interface DutyOverview {
  today: string;
  tomorrow: string;
  entries: DutyRosterEntry[];
  unavailable: boolean;
}

export async function getDutyOverview(): Promise<DutyOverview> {
  const window = dutyWindow();
  const empty: DutyOverview = { ...window, entries: [], unavailable: false };
  const session = await getSession();
  if (!session?.active || session.isFirstAccess) return { ...empty, unavailable: true };

  const supabase = createSupabaseServerClient();
  const [assignments, officers] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select("id,student_id,duty_date,duty_function")
      .eq("status", "published")
      .gte("duty_date", window.today)
      .lte("duty_date", window.tomorrow)
      .order("duty_date")
      .order("published_at"),
    supabase
      .from("schedule_officer_assignments")
      .select("id,profile_id,display_name,duty_date,duty_function,shift,starts_at,ends_at")
      .gte("duty_date", window.today)
      .lte("duty_date", window.tomorrow)
      .order("duty_date")
      .order("starts_at"),
  ]);
  if (assignments.error || officers.error) {
    console.error("Falha ao carregar escala do painel:", assignments.error ?? officers.error);
    return { ...empty, unavailable: true };
  }

  const ids = [...new Set((assignments.data ?? []).map((entry) => entry.student_id))];
  const students = ids.length
    ? await supabase
        .from("v_student_class_basic")
        .select("id,student_number,war_name")
        .in("id", ids)
    : { data: [], error: null };
  if (students.error) {
    console.error("Falha ao carregar equipe de serviço:", students.error);
    return { ...empty, unavailable: true };
  }

  const byId = new Map((students.data ?? []).map((student) => [student.id, student]));
  return {
    ...window,
    unavailable: false,
    entries: [...(assignments.data ?? []).flatMap((entry) => {
      const student = byId.get(entry.student_id);
      if (!student || !entry.duty_date) return [];
      return [{
        id: entry.id,
        kind: "cadet" as const,
        date: entry.duty_date,
        person: student.student_number == null
          ? student.war_name ?? "Cadete"
          : `${student.war_name ?? "Cadete"} — ${String(student.student_number).padStart(2, "0")}`,
        duty: entry.duty_function?.trim() || "Serviço de escala",
        mine: session.studentId === entry.student_id,
      }];
    }), ...(officers.data ?? []).map((entry) => ({
      id: entry.id,
      kind: "officer" as const,
      date: entry.duty_date,
      person: entry.display_name,
      duty: `${entry.duty_function} · ${shiftLabel[entry.shift] ?? entry.shift} ${entry.starts_at.slice(0, 5)}–${entry.ends_at.slice(0, 5)}`,
      mine: entry.profile_id === session.userId,
    }))].sort((a, b) => a.date.localeCompare(b.date) || a.person.localeCompare(b.person)),
  };
}
