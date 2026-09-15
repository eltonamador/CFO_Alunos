"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";

export type CoordinationTeamActionResult = { ok: boolean; message: string };

const linkSchema = z.object({
  memberId: z.string().uuid("Integrante inválido."),
  profileId: z.string().uuid("Conta inválida.").nullable(),
});

/**
 * Vincula uma conta de Coordenação já existente a um integrante designado.
 * A criação de contas e o envio de credenciais continuam fora deste fluxo.
 */
export async function linkCoordinationMemberProfileAction(
  _previous: CoordinationTeamActionResult | null,
  formData: FormData,
): Promise<CoordinationTeamActionResult> {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess || session.role !== "coordenacao") {
    return { ok: false, message: "Somente uma conta ativa da Coordenação pode alterar vínculos." };
  }

  const parsed = linkSchema.safeParse({
    memberId: formData.get("memberId"),
    profileId: formData.get("profileId") || null,
  });
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = createSupabaseServerClient();
  try {
    if (parsed.data.profileId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", parsed.data.profileId)
        .eq("role", "coordenacao")
        .eq("active", true)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile)
        return { ok: false, message: "A conta selecionada não é uma Coordenação ativa." };
    }

    const { data, error } = await supabase
      .from("cfo_coordination_members")
      .update({ profile_id: parsed.data.profileId })
      .eq("id", parsed.data.memberId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, message: "Integrante não encontrado." };

    revalidatePath("/coordenacao/equipe");
    revalidatePath("/coordenacao");
    revalidatePath("/escalas/calendario");
    return {
      ok: true,
      message: parsed.data.profileId
        ? "Conta individual vinculada e registrada na auditoria."
        : "Vínculo removido e registrado na auditoria.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar o vínculo.";
    if (message.includes("unique") || message.includes("duplicate")) {
      return { ok: false, message: "Esta conta já está vinculada a outro integrante." };
    }
    return { ok: false, message: "Não foi possível salvar o vínculo. Tente novamente." };
  }
}
