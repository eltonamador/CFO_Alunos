import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { OfflineRosterSession } from "@/components/app/schedules/OfflineRosterSession";
import { OfflineQtsSession } from "@/components/app/qts/OfflineQtsSession";
import { getSession, homePathForRole } from "@/modules/identity/presentation/session";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    if (session.isFirstAccess) redirect("/primeiro-acesso");
    redirect(homePathForRole(session.role));
  }

  return (
    <div className="p-6">
      <OfflineRosterSession userId={null} />
      <OfflineQtsSession userId={null} />
      <h2 className="mb-6 font-display text-lg font-semibold uppercase tracking-wide text-white/90">
        Entrar
      </h2>
      <LoginForm />
    </div>
  );
}
