"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireInternshipManager } from "./access";

const phone = z.string().regex(/^55\d{10,11}$/);

export async function saveEvaluationWhatsAppContacts(form: FormData): Promise<void> {
  const manager = await requireInternshipManager();
  const programId = z.string().uuid().safeParse(form.get("programId"));
  const primary = String(form.get("primaryPhone") ?? "").replace(/\D/g, "");
  const secondary = String(form.get("secondaryPhone") ?? "").replace(/\D/g, "");
  if (!programId.success || !phone.safeParse(primary).success ||
    (secondary && !phone.safeParse(secondary).success) || primary === secondary) {
    redirect("/coordenacao/estagio?resultado=whatsapp_invalido#whatsapp-avaliacoes");
  }
  const { error } = await createSupabaseServerClient()
    .from("internship_evaluation_whatsapp_contacts")
    .upsert({
      program_id: programId.data,
      primary_phone: primary,
      secondary_phone: secondary || null,
      updated_at: new Date().toISOString(),
      updated_by: manager.userId,
    });
  revalidatePath("/coordenacao/estagio");
  redirect(`/coordenacao/estagio?resultado=${error ? "whatsapp_falha" : "whatsapp_salvo"}#whatsapp-avaliacoes`);
}
