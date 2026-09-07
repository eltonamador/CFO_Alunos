import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { getSession } from "@/modules/identity/presentation/session";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { BirthdayBanner } from "@/components/app/BirthdayBanner";
import { getAdministrativeBirthdayAlerts } from "@/modules/student-profile/infrastructure/getAdministrativeBirthdayAlerts";

async function getUnreadAnnouncementsCount(studentId: string): Promise<number> {
  try {
    const supabase = createServerClientUntyped();
    const [{ data: allIds }, { data: readIds }] = await Promise.all([
      supabase.from("announcements").select("id").eq("status", "publicado"),
      supabase.from("announcement_reads").select("announcement_id").eq("student_id", studentId),
    ]);
    const readSet = new Set((readIds ?? []).map((r: { announcement_id: string }) => r.announcement_id));
    return (allIds ?? []).filter((a: { id: string }) => !readSet.has(a.id)).length;
  } catch {
    return 0;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.isFirstAccess) redirect("/primeiro-acesso");
  if (!session.active) redirect("/login");

  const canSeeBirthdayAlerts = session.role === "coordenacao" || session.role === "secretaria";
  const [unreadAnnouncements, birthdayAlerts] = await Promise.all([
    session.role === "aluno" && session.studentId
      ? getUnreadAnnouncementsCount(session.studentId)
      : Promise.resolve(0),
    canSeeBirthdayAlerts ? getAdministrativeBirthdayAlerts() : Promise.resolve([]),
  ]);

  return (
    <AppShell session={session} unreadAnnouncements={unreadAnnouncements}>
      <BirthdayBanner alerts={birthdayAlerts} />
      {children}
    </AppShell>
  );
}
