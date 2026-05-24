import { redirect } from "next/navigation";
import { getSession, homePathForRole } from "@/modules/identity/presentation/session";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.isFirstAccess) redirect("/primeiro-acesso");
  redirect(homePathForRole(session.role));
}
