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

  // Para o papel de aluno, busca war_name e student_number para exibição na UI
  let warName: string | null = null;
  let studentNumber: number | null = null;
  if (profile.role === "aluno" && profile.student_id) {
    const { data: studentData } = await supabase
      .from("students")
      .select("war_name, student_number")
      .eq("id", profile.student_id)
      .maybeSingle();
    warName = (studentData as any)?.war_name ?? null;
    studentNumber = (studentData as any)?.student_number ?? null;
  }

  return {
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
