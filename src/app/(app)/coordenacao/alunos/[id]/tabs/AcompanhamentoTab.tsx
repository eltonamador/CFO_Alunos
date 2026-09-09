import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  PunishmentBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/app/followup/FollowUpBadges";
import { formatShortDate } from "@/components/app/followup/format";
import type { FollowUpListItem } from "@/modules/cadet-followup/infrastructure/queries";

/**
 * Linha do tempo do cadete (item "Linha do Tempo / Acompanhamento").
 * Cada item abre o registro completo.
 */
export function AcompanhamentoTab({ items }: { items: FollowUpListItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} registro(s) no acompanhamento.
        </p>
        <Link
          href="/coordenacao/acompanhamento/novo"
          className={buttonVariants({ size: "sm", variant: "secondary" })}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Registrar FO
        </Link>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Nenhum fato observado registrado para este cadete.
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/coordenacao/acompanhamento/${item.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5 shadow-card-sm transition-colors hover:bg-secondary"
              >
                <span className="num-mono w-12 shrink-0 text-sm font-semibold text-muted-foreground">
                  {formatShortDate(item.occurredAt)}
                </span>
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <TypeBadge type={item.type} />
                    <StatusBadge status={item.status} />
                    {item.punishmentStatus && <PunishmentBadge status={item.punishmentStatus} />}
                  </span>
                  <span className="block truncate text-sm text-foreground">{item.reasonText}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
