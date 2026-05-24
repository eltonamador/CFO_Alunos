import Link from "next/link";
import {
  Home,
  Users,
  AlertTriangle,
  FileText,
  Search,
  GraduationCap,
  ClipboardList,
  Boxes,
  Folder,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/modules/identity/presentation/actions/authActions";
import type { SessionProfile } from "@/modules/identity/presentation/session";
import { Button } from "@/components/ui/Button";
import { NavLink } from "@/components/app/NavLink";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_BY_ROLE: Record<SessionProfile["role"], NavItem[]> = {
  coordenacao: [
    { href: "/coordenacao", label: "Início", icon: Home, exact: true },
    { href: "/coordenacao/alunos", label: "Alunos", icon: Users },
    { href: "/coordenacao/pendencias", label: "Pendências", icon: AlertTriangle },
    { href: "/coordenacao/relatorios", label: "Relatórios", icon: FileText },
  ],
  secretaria: [
    { href: "/secretaria", label: "Início", icon: Home, exact: true },
    { href: "/secretaria/documentos", label: "Documentos", icon: Folder },
    { href: "/secretaria/relatorios", label: "Relatórios", icon: FileText },
  ],
  instrutor: [
    { href: "/instrutor", label: "Buscar", icon: Search, exact: true },
    { href: "/instrutor/turma", label: "Turma", icon: GraduationCap },
  ],
  aluno: [
    { href: "/aluno", label: "Início", icon: Home, exact: true },
    { href: "/aluno/ficha", label: "Ficha", icon: ClipboardList },
    { href: "/aluno/documentos", label: "Documentos", icon: Folder },
    { href: "/aluno/materiais", label: "Materiais", icon: Boxes },
  ],
};

const ROLE_LABEL: Record<SessionProfile["role"], string> = {
  coordenacao: "Coordenação",
  secretaria: "Secretaria",
  instrutor: "Instrutor",
  aluno: "Aluno",
};

const ROLE_INITIALS: Record<SessionProfile["role"], string> = {
  coordenacao: "CO",
  secretaria: "SE",
  instrutor: "IN",
  aluno: "AL",
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
    <div className="flex min-h-screen bg-background">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-900 text-white md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-ink-800 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-red-700 font-display text-base font-bold tracking-wider text-white">
            CB
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-white">
              CFO Alunos
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-gold-300">
              CBMAP · AcBM
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              exact={item.exact}
              icon={<item.icon className="h-4 w-4" />}
            />
          ))}
        </nav>

        <div className="border-t border-ink-800 p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red-700 font-display text-xs font-semibold text-white">
              {ROLE_INITIALS[session.role]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{session.fullName}</p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-brand-gold-300">
                {ROLE_LABEL[session.role]}
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-ink-200 hover:bg-ink-800 hover:text-white"
            >
              Sair
            </Button>
          </form>
        </div>
      </aside>

      {/* ===== Coluna direita ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile + apoio desktop) */}
        <header className="sticky top-0 z-20 border-b border-border bg-card md:bg-background/95 md:backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 md:hidden">
            <Link href={`/${session.role === "coordenacao" ? "coordenacao" : session.role}`} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-red-700 font-display text-xs font-bold text-white">
                CB
              </div>
              <span className="font-display text-sm font-bold uppercase tracking-[0.1em] text-foreground">
                CFO Alunos
              </span>
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
          <div className="hidden h-14 items-center justify-end gap-3 px-6 md:flex">
            <p className="text-xs text-muted-foreground">
              <span className="uppercase tracking-[0.12em]">Logado como</span>{" "}
              <span className="font-semibold text-foreground">{session.fullName}</span>
            </p>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>

      {/* ===== Bottom nav (mobile) ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden">
        <div
          className="grid h-16 items-center"
          style={{ gridTemplateColumns: `repeat(${Math.min(nav.length, 4)}, minmax(0, 1fr))` }}
        >
          {nav.slice(0, 4).map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              variant="bottom"
              exact={item.exact}
              icon={<item.icon className="h-5 w-5" />}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
