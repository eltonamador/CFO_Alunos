import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchProfile } from "@/lib/supabase/queries/profiles";
import type { UserRoleValue } from "@/shared/domain";
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SessionProfile {
  userId: string;
  email: string;
  role: UserRoleValue;
  fullName: string;
  studentId: string | null;
  active: boolean;
  isFirstAccess: boolean;
  /** Permission resolved from the database, scoped to internship only. */
  canManageInternship?: boolean;
  /** Delegação limitada ao repositório de escalas. */
  canPublishSchedules?: boolean;
  /** Apenas para role="aluno": nome de guerra do aluno vinculado */
  warName: string | null;
  /** Apenas para role="aluno": número do aluno vinculado */
  studentNumber: number | null;
}

/**
 * Lê o usuário autenticado + seu profile.
 * Cached por request (React `cache`) — chame à vontade nos Server Components.
 */
export const getSession = cache(async (): Promise<SessionProfile | null> => {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await fetchProfile(supabase, user.id);
  if (!profile) return null;

  const isFirstAccess = !user.user_metadata?.password_changed_at;

  // Independent lookups run together, after authentication and profile validation.
  const isStudent = profile.role === "aluno" && profile.active;
  const [studentResult, { data: internshipManager }, { data: schedulePublisher }] = await Promise.all([
    isStudent && profile.student_id
      ? supabase.from("students").select("war_name, student_number").eq("id", profile.student_id).maybeSingle()
      : Promise.resolve({ data: null }),
    isStudent ? supabase.rpc("internship_can_manage") : Promise.resolve({ data: profile.active && profile.role === "coordenacao" }),
    isStudent ? supabase.rpc("schedule_can_publish") : Promise.resolve({ data: profile.active && profile.role === "coordenacao" }),
  ]);
  const warName = (studentResult.data as any)?.war_name ?? null;
  const studentNumber = (studentResult.data as any)?.student_number ?? null;

  return {
    canManageInternship: internshipManager === true,
    canPublishSchedules: schedulePublisher === true,
    userId: user.id,
    email: user.email ?? "",
    role: profile.role,
    fullName: profile.full_name,
    studentId: profile.student_id,
    active: profile.active,
    isFirstAccess,
    warName,
    studentNumber,
  };
});

export function homePathForRole(role: UserRoleValue): string {
  switch (role) {
    case "coordenacao":
      return "/coordenacao";
    case "secretaria":
      return "/secretaria";
    case "instrutor":
      return "/instrutor";
    case "aluno":
      return "/aluno";
  }
}
