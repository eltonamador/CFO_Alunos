import Link from "next/link";
import { logoutAction } from "@/modules/identity/presentation/actions/authActions";
import type { SessionProfile } from "@/modules/identity/presentation/session";
import { Button } from "@/components/ui/Button";

interface NavItem {
  href: string;
  label: string;
}

const NAV_BY_ROLE: Record<SessionProfile["role"], NavItem[]> = {
  coordenacao: [
    { href: "/coordenacao", label: "Início" },
    { href: "/coordenacao/alunos", label: "Alunos" },
    { href: "/coordenacao/pendencias", label: "Pendências" },
    { href: "/coordenacao/relatorios", label: "Relatórios" },
  ],
  secretaria: [
    { href: "/secretaria", label: "Início" },
    { href: "/secretaria/documentos", label: "Documentos" },
    { href: "/secretaria/relatorios", label: "Relatórios" },
  ],
  instrutor: [
    { href: "/instrutor", label: "Buscar" },
    { href: "/instrutor/turma", label: "Turma" },
  ],
  aluno: [
    { href: "/aluno", label: "Início" },
    { href: "/aluno/ficha", label: "Ficha" },
    { href: "/aluno/documentos", label: "Documentos" },
    { href: "/aluno/materiais", label: "Materiais" },
  ],
};

const ROLE_LABEL: Record<SessionProfile["role"], string> = {
  coordenacao: "Coordenação",
  secretaria: "Secretaria",
  instrutor: "Instrutor",
  aluno: "Aluno",
};

export function AppShell({
  session,
  children,
}: {
  session: SessionProfile;
  children: React.ReactNode;
}) {
  const nav = NAV_BY_ROLE[session.role];

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-primary">CFO Alunos</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">· CBMAP</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-medium">{session.fullName}</p>
              <p className="text-muted-foreground">{ROLE_LABEL[session.role]}</p>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
        {/* Desktop side-by-side nav (escondido no mobile) */}
        <nav className="container hidden gap-1 overflow-x-auto py-2 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="container flex-1 py-6 pb-24 md:pb-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background md:hidden">
        <div className="container grid h-16 grid-cols-4 items-center">
          {nav.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-full flex-col items-center justify-center px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
