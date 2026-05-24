import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchProfile } from "@/lib/supabase/queries/profiles";
import type { UserRoleValue } from "@/shared/domain";

export interface SessionProfile {
  userId: string;
  email: string;
  role: UserRoleValue;
  fullName: string;
  studentId: string | null;
  active: boolean;
  isFirstAccess: boolean;
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

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role,
    fullName: profile.full_name,
    studentId: profile.student_id,
    active: profile.active,
    isFirstAccess,
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
