import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  href: string;
  studentNumber: number | null;
  warName: string;
  fullName?: string;
  pelotao?: string | null;
  photoUrl?: string | null;
  badges?: {
    label: string;
    variant?: "default" | "primary" | "warning" | "success" | "destructive" | "info" | "gold";
  }[];
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

export function StudentListCard({
  href,
  studentNumber,
  warName,
  fullName,
  pelotao,
  photoUrl,
  badges = [],
}: Props) {
  const numberLabel = studentNumber ? String(studentNumber).padStart(2, "0") : "—";

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-card-sm transition-all hover:-translate-y-px hover:border-brand-red-100 hover:shadow-card-md"
    >
      <div className="flex flex-col items-center gap-1">
        <Avatar
          src={photoUrl ?? undefined}
          alt={warName}
          initials={initialsFrom(warName)}
          size="lg"
        />
        <span className="num-mono text-[11px] font-semibold text-muted-foreground">
          Nº {numberLabel}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-display text-base font-semibold uppercase tracking-[0.02em] text-foreground">
          {warName}
        </p>
        {fullName && fullName !== warName && (
          <p className="truncate text-xs text-muted-foreground">{fullName}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {pelotao && (
            <Badge variant="gold" dot>
              {pelotao}
            </Badge>
          )}
          {badges.map((b) => (
            <Badge key={b.label} variant={b.variant ?? "default"}>
              {b.label}
            </Badge>
          ))}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
