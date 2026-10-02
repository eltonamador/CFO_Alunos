import { AppLoading } from "@/components/app/AppLoading";
import { MobileSession } from "@/components/app/MobileSession";
import { NavBadge } from "@/components/app/NavLink";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BirthdayBanner } from "@/components/app/BirthdayBanner";
import { OfflineRosterSession } from "@/components/app/schedules/OfflineRosterSession";
import { OfflineQtsSession } from "@/components/app/qts/OfflineQtsSession";
import { getAdministrativeBirthdayAlerts } from "@/modules/student-profile/infrastructure/getAdministrativeBirthdayAlerts";

async function getUnreadAnnouncementsCount(studentId: string): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
    const [{ data: allIds }, { data: readIds }] = await Promise.all([
      supabase.from("announcements").select("id").eq("status", "publicado"),
      supabase.from("announcement_reads").select("announcement_id").eq("student_id", studentId),
    ]);
    const readSet = new Set(
      (readIds ?? []).map((r: { announcement_id: string }) => r.announcement_id),
    );
    return (allIds ?? []).filter((a: { id: string }) => !readSet.has(a.id)).length;
  } catch {
    return 0;
  }
}

/**
 * Badge do menu: para o cadete, FO− aguardando manifestação; para a
 * Coordenação, registros que dependem de decisão.
 */
async function getPendingFollowUpsCount(role: string, studentId: string | null): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
    let query = supabase.from("follow_up_records").select("id", { count: "exact", head: true });

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

/**
 * Alertas institucionais são informativos: não devem atrasar a entrega do
 * shell nem da página solicitada. O Suspense permite que sejam inseridos no
 * stream assim que a consulta terminar, sem expor dados de outra sessão.
 */
async function BirthdayBannerLoader() {
  const alerts = await getAdministrativeBirthdayAlerts();
  return alerts.length > 0 ? (
    <BirthdayBanner alerts={alerts} />
  ) : (
    <span aria-hidden="true" className="hidden" />
  );
}

async function UnreadAnnouncementsBadge({ studentId }: { studentId: string }) {
  const count = await getUnreadAnnouncementsCount(studentId);
  return (
    <span className="contents">
      <NavBadge count={count} />
    </span>
  );
}

async function FollowUpsBadge({ role, studentId }: { role: string; studentId: string | null }) {
  const count = await getPendingFollowUpsCount(role, studentId);
  return (
    <span className="contents">
      <NavBadge count={count} />
    </span>
  );
}

async function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.isFirstAccess) redirect("/primeiro-acesso");
  if (!session.active) redirect("/login");

  const canSeeBirthdayAlerts = session.role === "coordenacao" || session.role === "secretaria";

  return (
    <AppShell
      session={session}
      unreadAnnouncements={
        session.role === "aluno" && session.studentId ? (
          <Suspense fallback={<span aria-hidden="true" className="hidden" />}>
            <UnreadAnnouncementsBadge studentId={session.studentId} />
          </Suspense>
        ) : null
      }
      pendingFollowUps={
        <Suspense fallback={<span aria-hidden="true" className="hidden" />}>
          <FollowUpsBadge role={session.role} studentId={session.studentId} />
        </Suspense>
      }
    >
      {canSeeBirthdayAlerts && (
        <Suspense fallback={<span aria-hidden="true" className="hidden" />}>
          <BirthdayBannerLoader />
        </Suspense>
      )}
      <OfflineRosterSession userId={session.userId} />
      <OfflineQtsSession userId={session.userId} />
      <MobileSession
        identity={{
          userId: session.userId,
          role: session.role,
          canManageInternship: session.canManageInternship,
          canPublishSchedules: session.canPublishSchedules,
        }}
      />
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppLoading boot />}>
      <AuthenticatedApp>{children}</AuthenticatedApp>
    </Suspense>
  );
}
