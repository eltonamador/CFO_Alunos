import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { getSession } from "@/modules/identity/presentation/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.isFirstAccess) redirect("/primeiro-acesso");
  if (!session.active) redirect("/login");

  return <AppShell session={session}>{children}</AppShell>;
}
