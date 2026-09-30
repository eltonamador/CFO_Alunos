import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadInternshipReportData } from "@/lib/reports/internship-report-data";
import { loadPermanenceContext } from "@/modules/internship-management/infrastructure/permanenceContext";
import { readAll } from "@/modules/internship-management/infrastructure/readAll";
import { PermanencePlanner } from "@/modules/internship-management/presentation/PermanencePlanner";
import { canManageInternship } from "@/modules/internship-management/domain/access";
import { calendarDay } from "@/modules/internship-management/domain/rotation";
export async function PermanenceWorkspace({ embedded = false }: { embedded?: boolean }) {
  const session = await requireInternshipManager();
  const db = createSupabaseServerClient();
  const data = await loadInternshipReportData(db);
  const [duties, planningCadets, birthdays, constraints, blackouts, conflictsResult] = await Promise.all([
    loadPermanenceContext(db, data.program.id),
    readAll((f, t) =>
      db
        .rpc("internship_planning_cadets", { p_program_id: data.program.id })
        .order("id")
        .range(f, t),
    ),
    readAll((f, t) =>
      db
        .rpc("internship_planning_birthdays", { p_program_id: data.program.id })
        .order("student_id")
        .range(f, t),
    ),
    readAll((f, t) =>
      db
        .rpc("internship_planning_constraints", { p_program_id: data.program.id })
        .order("kind")
        .order("id")
        .range(f, t),
    ),
    readAll((f, t) =>
      db
        .from("internship_student_blackouts")
        .select(
          "student_id,starts_on,ends_on,blocked_weekdays,window_start_dow,window_start,window_minutes",
        )
        .eq("program_id", data.program.id)
        .order("id")
        .range(f, t),
    ),
    db.rpc("permanence_stage_conflicts", { p_program_id: data.program.id }),
  ]);
  if (conflictsResult.error) throw new Error("Não foi possível verificar conflitos com o estágio.");
  const birthByStudent = new Map(birthdays.map((row) => [row.student_id, row.birth_month_day]));
  const cadets = planningCadets.map((cadet) => ({
    ...cadet,
    birthMonthDay: birthByStudent.get(cadet.id) ?? null,
  }));
  const today = calendarDay(Date.now(), "America/Belem");
  const defaultDate =
    today < data.program.starts_on
      ? data.program.starts_on
      : today > data.program.ends_on
        ? data.program.ends_on
        : today;
  return (
    <PermanencePlanner
      embedded={embedded}
      program={data.program}
      canManage={canManageInternship(session)}
      defaultDate={defaultDate}
      duties={duties}
      conflicts={(conflictsResult.data ?? []).map((row) => ({
        ...row,
        conflict_kind: row.conflict_kind === "mesmo_dia" ? "mesmo_dia" : "folga",
      }))}
      cadets={cadets}
      constraints={constraints}
      blackouts={blackouts}
      assignments={data.schedule
        .filter((r) => r.student_id && r.assignment_id)
        .map((r) => ({
          studentId: r.student_id!,
          startsAt: r.starts_at,
          endsAt: r.ends_at,
          plannedMinutes: r.planned_minutes,
          approvedMinutes: r.validation_status === "homologado" ? r.approved_minutes : null,
          active: r.assignment_status === "prevista" && r.shift_status === "publicado",
        }))}
    />
  );
}
