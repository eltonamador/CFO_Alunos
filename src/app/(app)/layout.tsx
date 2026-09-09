import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BirthdayBanner } from "@/components/app/BirthdayBanner";
import { getAdministrativeBirthdayAlerts } from "@/modules/student-profile/infrastructure/getAdministrativeBirthdayAlerts";

async function getUnreadAnnouncementsCount(studentId: string): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
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

/**
 * Badge do menu: para o cadete, FO− aguardando manifestação; para a
 * Coordenação, registros que dependem de decisão.
 */
async function getPendingFollowUpsCount(
  role: string,
  studentId: string | null,
): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("follow_up_records")
      .select("id", { count: "exact", head: true });

    if (role === "aluno") {
      if (!studentId) return 0;
      query = query.eq("student_id", studentId).eq("status", "aguardando_manifestacao");
    } else if (role === "coordenacao") {
      query = query.in("status", ["aguardando_analise", "prazo_expirado"]);
    } else {
      return 0;
    }

    const { count } = await query;
    return count ?? 0;
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
  const [unreadAnnouncements, birthdayAlerts, pendingFollowUps] = await Promise.all([
    session.role === "aluno" && session.studentId
      ? getUnreadAnnouncementsCount(session.studentId)
      : Promise.resolve(0),
    canSeeBirthdayAlerts ? getAdministrativeBirthdayAlerts() : Promise.resolve([]),
    getPendingFollowUpsCount(session.role, session.studentId),
  ]);

  return (
    <AppShell
      session={session}
      unreadAnnouncements={unreadAnnouncements}
      pendingFollowUps={pendingFollowUps}
    >
      <BirthdayBanner alerts={birthdayAlerts} />
      {children}
    </AppShell>
  );
}
