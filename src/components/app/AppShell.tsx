import Link from "next/link";
import Image from "next/image";
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
  CalendarDays,
  Megaphone,
  Info,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/modules/identity/presentation/actions/authActions";
import type { SessionProfile } from "@/modules/identity/presentation/session";
import { Button } from "@/components/ui/Button";
import { NavLink } from "@/components/app/NavLink";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { getStudentSigla } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
}

const NAV_BY_ROLE: Record<SessionProfile["role"], NavItem[]> = {
  coordenacao: [
    { href: "/coordenacao", label: "Início", icon: Home, exact: true },
    { href: "/coordenacao/alunos", label: "Alunos", icon: Users },
    { href: "/coordenacao/operacional", label: "Operacional", icon: CalendarDays },
    { href: "/coordenacao/comunicados", label: "Comunicados", icon: Megaphone },
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
    { href: "/instrutor/operacional", label: "Operacional", icon: CalendarDays },
    { href: "/instrutor/turma", label: "Turma", icon: GraduationCap },
  ],
  aluno: [
    { href: "/aluno", label: "Início", icon: Home, exact: true },
    { href: "/aluno/operacional", label: "Operacional", icon: CalendarDays },
    { href: "/aluno/comunicados", label: "Comunicados", icon: Megaphone },
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

function getUserInitials(session: SessionProfile): string {
  if (session.role === "aluno" && session.warName) {
    return getStudentSigla(session.studentNumber, session.warName);
  }
  return ROLE_INITIALS[session.role];
}

function getUserDisplayName(session: SessionProfile): string {
  if (session.role === "aluno" && session.warName) {
    const num = session.studentNumber
      ? String(session.studentNumber).padStart(2, "0")
      : null;
    return num ? `${session.warName} — ${num}` : session.warName;
  }
  return session.fullName;
}

export function AppShell({
  session,
  unreadAnnouncements = 0,
  children,
}: {
  session: SessionProfile;
  unreadAnnouncements?: number;
  children: React.ReactNode;
}) {
  const baseNav = NAV_BY_ROLE[session.role];
  const nav: NavItem[] = baseNav.map((item) =>
    item.href === "/aluno/comunicados" && unreadAnnouncements > 0
      ? { ...item, badge: unreadAnnouncements }
      : item,
  );
  const userInitials = getUserInitials(session);
  const userDisplayName = getUserDisplayName(session);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===== Sidebar (desktop) ===== */}
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-black/20 text-white md:flex"
        style={{ backgroundColor: "#16140f" }}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-md font-display text-sm font-bold tracking-wider text-white"
            style={{ backgroundColor: "#8b1a1f" }}
          >
            CFO
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-white">
              CFO Alunos
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Image
                src="/brasao-abm.png"
                alt="ABM"
                width={16}
                height={16}
                className="object-contain opacity-70"
                draggable={false}
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                CBMAP · ABM
              </p>
            </div>
          </div>
        </div>

        <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              exact={item.exact}
              badge={item.badge}
              icon={<item.icon className="h-4 w-4" aria-hidden />}
            />
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white"
              style={{ backgroundColor: "#8b1a1f" }}
            >
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{userDisplayName}</p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/70">
                {ROLE_LABEL[session.role]}
              </p>
            </div>
          </div>
          <ThemeToggle className="mb-1 w-full text-white/85 hover:bg-white/10 hover:text-white" />
          <Link
            href="/sobre"
            className="mb-1 flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Info className="h-4 w-4" aria-hidden />
            <span>Sobre o aplicativo</span>
          </Link>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-white/85 hover:bg-white/10 hover:text-white"
            >
              Sair
            </Button>
          </form>
        </div>
      </aside>

      {/* ===== Coluna direita ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (apenas mobile — desktop usa sidebar) */}
        <header className="sticky top-0 z-20 border-b border-border bg-card md:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link
              href={`/${session.role === "coordenacao" ? "coordenacao" : session.role}`}
              className="flex items-center gap-2"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md font-display text-[10px] font-bold text-white"
                style={{ backgroundColor: "#8b1a1f" }}
              >
                CFO
              </div>
              <span className="font-display text-sm font-bold uppercase tracking-[0.1em] text-foreground">
                CFO Alunos
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/sobre"
                aria-label="Sobre o aplicativo"
                title="Sobre o aplicativo"
                className="flex h-11 w-11 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Info className="h-[18px] w-[18px]" aria-hidden />
              </Link>
              <ThemeToggle showLabel={false} />
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Sair
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">{children}</main>
      </div>

      {/* ===== Bottom nav (mobile) ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden">
        <div
          className="grid h-16 min-w-full items-center overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(74px, 1fr))` }}
        >
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              variant="bottom"
              exact={item.exact}
              badge={item.badge}
              icon={<item.icon className="h-5 w-5" />}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
