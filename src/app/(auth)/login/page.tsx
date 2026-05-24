import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getSession, homePathForRole } from "@/modules/identity/presentation/session";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    if (session.isFirstAccess) redirect("/primeiro-acesso");
    redirect(homePathForRole(session.role));
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">Entrar</h2>
      <LoginForm />
    </div>
  );
}
