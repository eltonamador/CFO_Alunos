import { redirect } from "next/navigation";
import { getSession, homePathForRole } from "@/modules/identity/presentation/session";
import type { UserRoleValue } from "@/shared/domain";

/**
 * Use no topo de páginas Server Component para forçar a role correta.
 * Aceita uma role única ou um array de roles permitidas.
 * O middleware já barra acessos cruzados — este é o segundo cinto de segurança.
 */
export async function requireRole(role: UserRoleValue | UserRoleValue[]) {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(session.role)) redirect(homePathForRole(session.role));

  return session;
}
