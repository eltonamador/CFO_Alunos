"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchProfile } from "@/lib/supabase/queries/profiles";
import { homePathForRole } from "@/modules/identity/presentation/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { ok: false, error: "E-mail ou senha incorretos" };
  }

  const profile = await fetchProfile(supabase, data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, error: "Perfil não encontrado. Procure a Coordenação." };
  }
  if (!profile.active) {
    await supabase.auth.signOut();
    return { ok: false, error: "Conta inativa. Procure a Coordenação." };
  }

  const isFirstAccess = !data.user.user_metadata?.password_changed_at;
  if (isFirstAccess) {
    redirect("/primeiro-acesso");
  }

  redirect(homePathForRole(profile.role));
}

export async function logoutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Pelo menos 1 maiúscula")
      .regex(/[0-9]/, "Pelo menos 1 número"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Senhas não coincidem", path: ["confirm"] });

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Senha inválida" };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada — entre novamente" };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { password_changed_at: new Date().toISOString() },
  });
  if (error) return { ok: false, error: error.message };

  const profile = await fetchProfile(supabase, user.id);
  redirect(homePathForRole(profile?.role ?? "aluno"));
}
