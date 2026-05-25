import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { getStudentSigla, cn } from "@/lib/utils";
import { STATUS_META, type ProgressResult } from "@/lib/student-progress";

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
  progress?: ProgressResult;
}

export function StudentListCard({
  href,
  studentNumber,
  warName,
  fullName,
  pelotao,
  photoUrl,
  badges = [],
  progress,
}: Props) {
  const numberLabel = studentNumber ? String(studentNumber).padStart(2, "0") : "—";
  const meta = progress ? STATUS_META[progress.status] : null;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-card-sm transition-all hover:-translate-y-px hover:border-brand-red-100 hover:shadow-card-md"
    >
      <div className="flex shrink-0 items-center justify-center">
        <Avatar
          src={photoUrl ?? undefined}
          alt={warName}
          initials={getStudentSigla(studentNumber, warName)}
          size="lg"
        />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-display text-base font-semibold uppercase tracking-[0.02em] text-foreground">
          {warName} — {numberLabel}
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
          {progress && meta && (
            <Badge variant={meta.badgeVariant} aria-label={`Ficha ${meta.label}`}>
              {meta.label}
            </Badge>
          )}
        </div>
        {progress && meta && (
          <div
            className="flex items-center gap-2 pt-1"
            aria-label={`Progresso da ficha: ${progress.percent}% (${meta.label})`}
          >
            <div
              className={cn("h-1 flex-1 overflow-hidden rounded-full", meta.trackClass)}
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn("h-full rounded-full transition-all", meta.barClass)}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span
              className={cn(
                "num-mono shrink-0 text-[11px] font-semibold tabular-nums",
                meta.textClass,
              )}
            >
              {progress.percent}%
            </span>
          </div>
        )}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
