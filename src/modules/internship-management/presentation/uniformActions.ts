"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canManageInternship } from "../domain/access";

const schema = z.object({
  shiftId: z.string().uuid(),
  uniformCode: z.enum(["3A", "2C", "4A", "4D"]),
});
export async function saveInternshipUniform(form: FormData) {
  const session = await getSession();
  if (!canManageInternship(session)) throw Error("Acesso restrito à administração do estágio.");
  const parsed = schema.safeParse({
    shiftId: form.get("shiftId"),
    uniformCode: form.get("uniformCode"),
  });
  if (!parsed.success) throw Error("Revise o plantão e o uniforme.");
  const { error } = await createSupabaseServerClient().rpc("internship_set_shift_uniform", {
    p_shift_id: parsed.data.shiftId,
    p_uniform_code: parsed.data.uniformCode,
  });
  if (error) throw Error("Não foi possível salvar o uniforme da escala.");
  revalidatePath("/coordenacao/estagio/agenda");
}
