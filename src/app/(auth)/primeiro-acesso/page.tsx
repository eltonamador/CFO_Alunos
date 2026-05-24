import { redirect } from "next/navigation";
import { FirstAccessForm } from "./FirstAccessForm";
import { getSession, homePathForRole } from "@/modules/identity/presentation/session";

export const metadata = { title: "Primeiro acesso" };

export default async function PrimeiroAcessoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isFirstAccess) redirect(homePathForRole(session.role));

  return (
    <div className="p-6">
      <h2 className="mb-2 font-display text-lg font-semibold uppercase tracking-wide text-white/90">
        Bem-vindo, {session.fullName}
      </h2>
      <p className="mb-6 text-sm text-white/50">
        Este é seu primeiro acesso. Defina uma nova senha para continuar.
      </p>
      <FirstAccessForm />
    </div>
  );
}

