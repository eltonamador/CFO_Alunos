import { redirect } from "next/navigation";
import { getSession, homePathForRole } from "@/modules/identity/presentation/session";
import { canManageInternship } from "../domain/access";
export async function requireInternshipManager() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageInternship(session)) redirect(homePathForRole(session.role));
  return session;
}
