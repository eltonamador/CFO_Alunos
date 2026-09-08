import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { FollowUpListItem } from "@/modules/cadet-followup/infrastructure/queries";
import { studentLabel } from "@/modules/cadet-followup/infrastructure/queries";
import { DeadlineCountdown } from "./DeadlineCountdown";
import { PunishmentBadge, StatusBadge, TypeBadge } from "./FollowUpBadges";
import { formatDateTime } from "./format";

interface FollowUpListProps {
  items: FollowUpListItem[];
  hrefBase: string;
  /** Oculta o nome do cadete (usado na área do próprio cadete). */
  hideStudent?: boolean;
  emptyMessage?: string;
}

export function FollowUpList({
  items,
  hrefBase,
  hideStudent,
  emptyMessage = "Nenhum registro nesta fila.",
}: FollowUpListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">{emptyMessage}</CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`${hrefBase}/${item.id}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card-sm transition-colors hover:bg-secondary"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />
                {item.punishmentStatus && <PunishmentBadge status={item.punishmentStatus} />}
              </div>

              {!hideStudent && (
                <p className="truncate font-display text-base font-bold uppercase tracking-[0.02em]">
                  {studentLabel(item.student)}
                </p>
              )}

              <p className="truncate text-sm text-foreground">{item.reasonText}</p>

              <p className="text-xs text-muted-foreground">
                {formatDateTime(item.occurredAt)}
                {item.createdByName ? ` · ${item.createdByName}` : ""}
              </p>

              {item.status === "aguardando_manifestacao" && item.deadlineAt && (
                <DeadlineCountdown deadline={item.deadlineAt} className="text-xs" />
              )}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
