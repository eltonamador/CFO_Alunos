import { redirect } from "next/navigation";
import { requireRole } from "@/components/app/RoleGuard";

/**
 * A secretaria acessa os relatórios pela mesma página da coordenação,
 * que filtra os relatórios disponíveis por role automaticamente.
 */
export default async function SecretariaRelatoriosPage() {
  await requireRole("secretaria");
  redirect("/coordenacao/relatorios");
}
