import { redirect } from "next/navigation";
import { FirstAccessForm } from "./FirstAccessForm";
import { getSession, homePathForRole } from "@/modules/identity/presentation/session";

export const metadata = { title: "Primeiro acesso" };

export default async function PrimeiroAcessoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isFirstAccess) redirect(homePathForRole(session.role));

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-2 text-xl font-semibold">Bem-vindo, {session.fullName}</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Este é seu primeiro acesso. Defina uma nova senha para continuar.
      </p>
      <FirstAccessForm />
    </div>
  );
}
