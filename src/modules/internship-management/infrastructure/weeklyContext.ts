import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPermanenceContext } from "./permanenceContext";
import { readAll } from "./readAll";
import { addDays, calendarDay } from "../domain/rotation";
import { weeklyWindowOverlaps } from "../domain/blackouts";
import type { WeeklyContext, WeeklySlot } from "../domain/weeklyPlanning";

export async function loadWeeklyContext(
  db: ReturnType<typeof createSupabaseServerClient>,
  input: {
    programId: string;
    weekStart: string;
    siteIds: string[];
    templateCodes: string[];
    lifeguard: boolean;
  },
): Promise<WeeklyContext> {
  const { data: program, error } = await db
    .from("internship_programs")
    .select("*")
    .eq("id", input.programId)
    .single();
  if (error || !program || program.status !== "publicado")
    throw new Error("Programa indisponível.");
  if (program.timezone !== "America/Belem") throw new Error("Fuso do programa incompatível.");
  const first = input.weekStart,
    last = addDays(first, 6);
  if (new Date(`${first}T12:00:00Z`).getUTCDay() !== 1)
    throw new Error("Escolha a segunda-feira de início da semana.");
  const [planningCadets, birthdays, sites, templates] = await Promise.all([
    readAll((from, to) =>
      db
        .rpc("internship_planning_cadets", { p_program_id: program.id })
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .rpc("internship_planning_birthdays", { p_program_id: program.id })
        .order("student_id")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .from("internship_sites")
        .select("id,name,code,site_type")
        .eq("program_id", program.id)
        .eq("active", true)
        .order("code")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .from("internship_shift_templates")
        .select("code,start_weekdays,counting_start_time,journey_minutes")
        .eq("program_id", program.id)
        .eq("active", true)
        .order("code")
        .range(from, to),
    ),
  ]);
  const birthByStudent = new Map(birthdays.map((row) => [row.student_id, row.birth_month_day]));
  const cadets = planningCadets.map((cadet) => ({
    ...cadet,
    birthMonthDay: birthByStudent.get(cadet.id) ?? null,
  }));
  if (!cadets.length) throw new Error("Nenhum cadete cadastrado para o programa.");
  if (
    input.siteIds.some((id) => !sites.some((s) => s.id === id && s.site_type === "gbm")) ||
    input.templateCodes.some((code) => !templates.some((t) => t.code === code))
  )
    throw new Error("Revise os serviços e GBMs escolhidos.");
  const ids = cadets.map((c) => c.id);
  const [
    history,
    commitments,
    constraints,
    blackouts,
    occupied,
    permanence,
    instructionBlocks,
    lifeguardWindows,
    lifeguardPlans,
  ] = await Promise.all([
    readAll((from, to) =>
      db
        .rpc("internship_coordination_schedule", { p_program_id: program.id })
        .order("shift_id")
        .order("assignment_id")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .from("internship_assignments")
        .select("id,student_id,internship_shifts!inner(starts_at,ends_at,status)")
        .in("student_id", ids)
        .eq("status", "prevista")
        .eq("internship_shifts.status", "publicado")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .rpc("internship_planning_constraints", { p_program_id: program.id })
        .order("kind")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .from("internship_student_blackouts")
        .select(
          "id,student_id,starts_on,ends_on,blocked_weekdays,window_start_dow,window_start,window_minutes",
        )
        .eq("program_id", program.id)
        .lte("starts_on", addDays(last, 1))
        .gte("ends_on", first)
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .from("internship_shifts")
        .select("id,site_id,starts_at,ends_at,internship_activity_types!inner(code)")
        .eq("program_id", program.id)
        .eq("status", "publicado")
        .order("id")
        .range(from, to),
    ),
    loadPermanenceContext(db, program.id),
    readAll((from, to) =>
      db
        .from("internship_instruction_blocks")
        .select("id,starts_at,ends_at,title")
        .eq("program_id", program.id)
        .eq("active", true)
        .order("starts_at")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .from("internship_lifeguard_windows")
        .select("shift_date,starts_at,ends_at")
        .eq("program_id", program.id)
        .gte("shift_date", first)
        .lte("shift_date", last)
        .order("shift_date")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .from("internship_operation_plans")
        .select("code,internship_shifts!inner(status)")
        .neq("internship_shifts.status", "cancelado")
        .eq("program_id", program.id)
        .gte("code", `guarda_vida_${first.replaceAll("-", "")}`)
        .lte("code", `guarda_vida_${last.replaceAll("-", "")}`)
        .order("code")
        .range(from, to),
    ),
  ]);
  const timedDutyIds = new Set(
    permanence.filter((row) => row.startsAt && row.endsAt).map((row) => row.id),
  );
  const duties = constraints
    .filter((row) => row.kind === "abm" && !timedDutyIds.has(row.id))
    .map((row) => ({ ...row, duty_date: row.starts_on }));
  const impediments = constraints.filter((row) => row.kind === "impedimento");
  const slots: WeeklySlot[] = [];
  const recordedLifeguardDays: NonNullable<WeeklyContext["recordedLifeguardDays"]> = [];
  const add = (
    date: string,
    templateCode: string,
    site: (typeof sites)[number],
    departure: string,
    minutes: number,
    window?: { starts_at: string; ends_at: string },
  ) => {
    const startsAt = window?.starts_at ?? new Date(`${date}T${departure}-03:00`).toISOString();
    const endsAt =
      window?.ends_at ?? new Date(Date.parse(startsAt) + minutes * 60000).toISOString();
    const finalDay = calendarDay(Date.parse(endsAt) - 1000, program.timezone);
    if (date < program.starts_on || finalDay > program.ends_on) return;
    const blocked: Record<string, string[]> = {};
    const block = (id: string, message: string) => {
      (blocked[id] ??= []).push(message);
    };
    const activity =
      templateCode === "GUARDA-VIDA" ? "guarda_vida" : templateCode.includes("USB") ? "usb" : "ar";
    const overlap = occupied.some(
      (row) =>
        row.site_id === site.id &&
        row.internship_activity_types.code === activity &&
        Date.parse(row.starts_at) < Date.parse(endsAt) &&
        Date.parse(row.ends_at) > Date.parse(startsAt),
    );
    if (overlap) return;
    const dailyLimit =
      ["usb", "ar"].includes(activity) && [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())
        ? 2
        : 1;
    const dailyCount = occupied.filter(
      (row) =>
        row.site_id === site.id &&
        row.internship_activity_types.code === activity &&
        calendarDay(row.starts_at, program.timezone) === date,
    ).length;
    if (dailyCount >= dailyLimit) return;
    if (
      instructionBlocks.some(
        (row) =>
          Date.parse(row.starts_at) < Date.parse(endsAt) &&
          Date.parse(row.ends_at) > Date.parse(startsAt),
      )
    )
      cadets.forEach((c) => block(c.id, "Conflito com instrução obrigatória do QTS."));
    duties
      .filter(
        (d) =>
          d.ends_on >= addDays(date, -program.abm_buffer_days) &&
          d.duty_date <= addDays(finalDay, program.abm_buffer_days),
      )
      .forEach((d) => block(d.student_id, "Conflito com serviço ABM e intervalo de proteção"));
    impediments
      .filter((i) => i.starts_on <= finalDay && i.ends_on >= date)
      .forEach((i) => block(i.student_id, "Impedimento operacional ativo"));
    blackouts.forEach((b) => {
      if (weeklyWindowOverlaps(b, startsAt, endsAt)) {
        block(b.student_id, "Indisponibilidade cadastrada para o horário");
        return;
      }
      for (let day = date; day <= finalDay; day = addDays(day, 1))
        if (
          day >= b.starts_on &&
          day <= b.ends_on &&
          b.blocked_weekdays.includes(new Date(`${day}T12:00:00Z`).getUTCDay())
        ) {
          block(b.student_id, "Indisponibilidade cadastrada para a data");
          break;
        }
    });
    slots.push({
      id: `${date}:${templateCode}:${site.id}`,
      date,
      templateCode,
      siteId: site.id,
      siteName: site.name,
      startsAt,
      endsAt,
      blocked,
    });
  };
  for (let day = first; day <= last; day = addDays(day, 1)) {
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay() || 7;
    for (const template of templates.filter(
      (t) => input.templateCodes.includes(t.code) && t.start_weekdays.includes(dow),
    )) {
      for (const site of sites.filter((s) => input.siteIds.includes(s.id)))
        add(day, template.code, site, template.counting_start_time, template.journey_minutes);
    }
    if (input.lifeguard && dow >= 6) {
      if (lifeguardPlans.some((plan) => plan.code === `guarda_vida_${day.replaceAll("-", "")}`)) {
        const rows = history.filter(
          (r) => r.activity_code === "guarda_vida" && r.shift_date === day,
        );
        recordedLifeguardDays.push({
          date: day,
          publishedCount: new Set(
            rows.filter((r) => r.shift_status === "publicado").map((r) => r.shift_id),
          ).size,
          draftCount: new Set(
            rows.filter((r) => r.shift_status === "rascunho").map((r) => r.shift_id),
          ).size,
        });
        continue;
      }
      const beaches = sites.filter((s) => s.site_type === "praia" && /^praia_[1-5]$/.test(s.code));
      if (beaches.length !== 5) throw new Error("Configure os cinco postos de guarda-vida.");
      const window = lifeguardWindows.find((row) => row.shift_date === day);
      beaches.forEach((site) => add(day, "GUARDA-VIDA", site, "10:00:00", 480, window));
    }
  }
  return {
    recordedLifeguardDays,
    cadets,
    duties: permanence,
    timezone: program.timezone,
    slots,
    assignments: history
      .filter((r) => r.assignment_id && r.student_id)
      .map((r) => ({
        studentId: r.student_id,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        activityCode: r.activity_code,
        siteName: r.site_name,
        plannedMinutes: r.planned_minutes,
        approvedMinutes: r.validation_status === "homologado" ? r.approved_minutes : null,
        active: r.assignment_status === "prevista" && r.shift_status === "publicado",
      })),
    commitments: commitments.map((r) => ({
      studentId: r.student_id,
      startsAt: r.internship_shifts.starts_at,
      endsAt: r.internship_shifts.ends_at,
    })),
  };
}
