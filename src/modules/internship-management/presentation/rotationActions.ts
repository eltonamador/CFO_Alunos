"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canManageInternship } from "../domain/access";
import { getSession } from "@/modules/identity/presentation/session";
import {
  addDays,
  calendarDay,
  rankRotationCandidates,
  type RotationCandidate,
} from "../domain/rotation";
import { loadPermanenceContext } from "../infrastructure/permanenceContext";
import { readAll } from "../infrastructure/readAll";
import { weeklyWindowOverlaps } from "../domain/blackouts";

const schema = z.object({
  programId: z.string().uuid(),
  shiftDate: z.string().date(),
  templateCode: z.string().min(3).max(30),
  siteId: z.string().uuid().optional(),
});
export type RotationResult =
  | { candidates: RotationCandidate[]; error?: never }
  | { error: string; candidates?: never };

export async function suggestInternshipRotation(input: {
  programId: string;
  shiftDate: string;
  templateCode: string;
  siteId?: string;
}): Promise<RotationResult> {
  const session = await getSession();
  if (!canManageInternship(session))
    return { error: "Acesso restrito à administração do estágio." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Escolha a data e o serviço para consultar o rodízio." };
  const db = createSupabaseServerClient();
  try {
    const { data: program, error } = await db
      .from("internship_programs")
      .select("id, class_id, starts_on, ends_on, timezone, abm_buffer_days, status")
      .eq("id", parsed.data.programId)
      .single();
    if (error || !program || program.status !== "publicado")
      return { error: "Programa indisponível para planejamento." };
    // Current CFO operational templates use the America/Belem civil clock.
    if (program.timezone !== "America/Belem")
      return { error: "Fuso do programa incompatível com os padrões operacionais atuais." };
    const weekday = new Date(`${input.shiftDate}T12:00:00Z`).getUTCDay() || 7;
    let departure = "10:00:00";
    let minutes = 480;
    let specialWindow: { starts_at: string; ends_at: string } | null = null;
    if (input.templateCode === "GUARDA-VIDA") {
      if (![6, 7].includes(weekday)) return { error: "Guarda-vida ocorre aos sábados e domingos." };
      const { data: window, error: windowError } = await db
        .from("internship_lifeguard_windows")
        .select("starts_at,ends_at")
        .eq("program_id", program.id)
        .eq("shift_date", input.shiftDate)
        .maybeSingle();
      if (windowError) return { error: "Não foi possível consultar a janela de guarda-vidas." };
      specialWindow = window;
    } else {
      const { data: template, error: templateError } = await db
        .from("internship_shift_templates")
        .select("start_weekdays, counting_start_time, journey_minutes")
        .eq("program_id", program.id)
        .eq("code", input.templateCode)
        .eq("active", true)
        .single();
      if (templateError || !template || !template.start_weekdays.includes(weekday)) {
        return { error: "O padrão escolhido não permite essa data de início." };
      }
      departure = template.counting_start_time;
      minutes = template.journey_minutes;
    }
    let siteName: string | undefined;
    if (parsed.data.siteId && input.templateCode !== "GUARDA-VIDA") {
      const { data: site, error: siteError } = await db
        .from("internship_sites")
        .select("name")
        .eq("id", parsed.data.siteId)
        .eq("program_id", program.id)
        .eq("site_type", "gbm")
        .eq("active", true)
        .single();
      if (siteError || !site) return { error: "GBM escolhido indisponível." };
      siteName = site.name;
    }
    const startsAt = specialWindow?.starts_at ?? new Date(`${input.shiftDate}T${departure}-03:00`).toISOString();
    const endsAt = specialWindow?.ends_at ?? new Date(Date.parse(startsAt) + minutes * 60_000).toISOString();
    const first = calendarDay(startsAt, program.timezone);
    const last = calendarDay(Date.parse(endsAt) - 1000, program.timezone);
    if (first < program.starts_on || last > program.ends_on)
      return { error: "Todo o plantão deve estar dentro do período do programa." };
    const [planningCadets, birthdays] = await Promise.all([
      readAll((from, to) => db
        .rpc("internship_planning_cadets", { p_program_id: program.id })
        .order("id")
        .range(from, to)),
      readAll((from, to) => db
        .rpc("internship_planning_birthdays", { p_program_id: program.id })
        .order("student_id")
        .range(from, to)),
    ]);
    const birthByStudent = new Map(birthdays.map((row) => [row.student_id, row.birth_month_day]));
    const cadets = planningCadets.map((cadet) => ({
      ...cadet,
      birthMonthDay: birthByStudent.get(cadet.id) ?? null,
    }));
    if (!cadets.length) return { candidates: [] };
    const ids = cadets.map((cadet) => cadet.id);
    const [history, commitments, constraints, blackouts, permanence, instructionBlocks] = await Promise.all([
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
          .select("id, student_id, internship_shifts!inner(starts_at, ends_at, status)")
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
            "id, student_id, starts_on, ends_on, blocked_weekdays, window_start_dow, window_start, window_minutes",
          )
          .eq("program_id", program.id)
          .lte("starts_on", last)
          .gte("ends_on", first)
          .order("id")
          .range(from, to),
      ),
      loadPermanenceContext(db, program.id),
      readAll((from, to) => db.from("internship_instruction_blocks")
        .select("starts_at,ends_at")
        .eq("program_id", program.id)
        .eq("active", true)
        .order("starts_at")
        .range(from, to)),
    ]);
    const timedDutyIds = new Set(
      permanence.filter((row) => row.startsAt && row.endsAt).map((row) => row.id),
    );
    const duties = constraints.filter(
      (row) =>
        row.kind === "abm" && !timedDutyIds.has(row.id) &&
        row.ends_on >= addDays(first, -program.abm_buffer_days) &&
        row.starts_on <= addDays(last, program.abm_buffer_days),
    );
    const impediments = constraints.filter(
      (row) => row.kind === "impedimento" && row.starts_on <= last && row.ends_on >= first,
    );
    const blocked: Record<string, string[]> = {};
    const block = (id: string, reason: string) => {
      (blocked[id] ??= []).push(reason);
    };
    duties.forEach((row) =>
      block(row.student_id, "Conflito com serviço ABM e intervalo de proteção"),
    );
    impediments.forEach((row) => block(row.student_id, "Impedimento operacional ativo"));
    if (instructionBlocks.some((row) =>
      Date.parse(row.starts_at) < Date.parse(endsAt) && Date.parse(row.ends_at) > Date.parse(startsAt)
    )) cadets.forEach((cadet) => block(cadet.id, "Conflito com instrução obrigatória do QTS"));
    blackouts.forEach((row) => {
      if (weeklyWindowOverlaps(row, startsAt, endsAt)) {
        block(row.student_id, "Indisponibilidade cadastrada para o horário");
        return;
      }
      for (let day = first; day <= last; day = addDays(day, 1)) {
        if (
          day >= row.starts_on &&
          day <= row.ends_on &&
          row.blocked_weekdays.includes(new Date(`${day}T12:00:00Z`).getUTCDay())
        ) {
          block(row.student_id, "Indisponibilidade cadastrada para a data");
          break;
        }
      }
    });
    return {
      candidates: rankRotationCandidates({
        cadets,
        duties: permanence,
        startsAt,
        endsAt,
        targetActivityCode: input.templateCode === "GUARDA-VIDA" ? "guarda_vida" : input.templateCode.includes("USB") ? "usb" : "ar",
        targetSiteName: siteName,
        timezone: program.timezone,
        blocked,
        assignments: history
          .filter((row) => row.assignment_id && row.student_id)
          .map((row) => ({
            studentId: row.student_id,
            startsAt: row.starts_at,
            endsAt: row.ends_at,
            activityCode: row.activity_code,
            siteName: row.site_name,
            plannedMinutes: row.planned_minutes,
            approvedMinutes: row.validation_status === "homologado" ? row.approved_minutes : null,
            active: row.assignment_status === "prevista" && row.shift_status === "publicado",
          })),
        commitments: commitments.map((row) => ({
          studentId: row.student_id,
          startsAt: row.internship_shifts.starts_at,
          endsAt: row.internship_shifts.ends_at,
        })),
      }),
    };
  } catch {
    return { error: "Não foi possível consultar o rodízio completo. Tente novamente." };
  }
}
