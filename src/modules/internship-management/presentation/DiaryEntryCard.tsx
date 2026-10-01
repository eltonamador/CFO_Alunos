import type { ReactNode } from "react";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  PARTICIPATIONS,
  SEVERITIES,
  entryTypes,
  entryVehicles,
  formatDiaryDate,
  occurrenceTypeLabel,
  optionLabel,
  type DiaryBadge,
  type DiaryEntry,
} from "../domain/occurrenceDiary";

const severityVariant = { leve: "success", moderada: "warning", grave: "destructive" } as const;

function StatusBadge({ entry }: { entry: DiaryEntry }) {
  if (entry.status === "rascunho") return <Badge variant="warning">Rascunho</Badge>;
  if (entry.status === "pessoal") return <Badge>No diário</Badge>;
  if (entry.hidden_at) return <Badge variant="destructive">Oculto do mural</Badge>;
  return <Badge variant="success">No mural</Badge>;
}

export function DiaryEntryCard({
  entry,
  author,
  companions = [],
  shift,
  showStatus = false,
  children,
}: {
  entry: DiaryEntry;
  author?: string;
  companions?: string[];
  shift?: string;
  showStatus?: boolean;
  children?: ReactNode;
}) {
  const types = entryTypes(entry)
    .map((type) => occurrenceTypeLabel(type, entry.other_type))
    .filter(Boolean);
  const vehicles = entryVehicles(entry);
  const severity = optionLabel(SEVERITIES, entry.severity);
  const participation = optionLabel(PARTICIPATIONS, entry.participation);
  const featured = entry.featured_at && entry.status === "compartilhado" && !entry.hidden_at;
  return (
    <article
      id={`relato-${entry.id}`}
      className="scroll-mt-24 space-y-3 rounded-lg border bg-card p-4 text-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">
            {[author, formatDiaryDate(entry.occurred_on), shift].filter(Boolean).join(" · ")}
          </p>
          <h3 className="break-words text-base font-semibold">
            {entry.summary || "Rascunho sem título"}
          </h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {featured ? <Badge variant="gold">Destaque da Coordenação</Badge> : null}
          {showStatus ? <StatusBadge entry={entry} /> : null}
        </div>
      </header>
      {types.length || severity || participation || vehicles.length ? (
        <div className="flex flex-wrap gap-1">
          {types.map((type) => (
            <Badge key={type} variant="outline">
              {type}
            </Badge>
          ))}
          {severity ? (
            <Badge variant={severityVariant[entry.severity as keyof typeof severityVariant]}>
              {severity}
            </Badge>
          ) : null}
          {participation ? <Badge variant="info">{participation}</Badge> : null}
          {vehicles.map((vehicle) => (
            <Badge key={vehicle}>{vehicle}</Badge>
          ))}
        </div>
      ) : null}
      {entry.perception ? (
        <p className="whitespace-pre-line break-words border-l-2 pl-3 italic">{entry.perception}</p>
      ) : null}
      {entry.description ? (
        entry.description.length > 280 ? (
          <details>
            <summary className="cursor-pointer text-primary">Ler relato completo</summary>
            <p className="mt-2 whitespace-pre-line break-words">{entry.description}</p>
          </details>
        ) : (
          <p className="whitespace-pre-line break-words">{entry.description}</p>
        )
      ) : null}
      {companions.length ? (
        <p className="text-xs text-muted-foreground">Com {companions.join(", ")}</p>
      ) : null}
      {entry.protocol_number ? (
        <p className="text-xs text-muted-foreground">Ocorrência nº {entry.protocol_number}</p>
      ) : null}
      {showStatus && entry.hidden_at ? (
        <p className="text-xs text-muted-foreground">
          Oculto do mural pela Coordenação{entry.hidden_reason ? `: ${entry.hidden_reason}` : "."}
        </p>
      ) : null}
      {children}
    </article>
  );
}

export function DiaryBadges({ badges }: { badges: DiaryBadge[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge) => (
        <li
          key={badge.code}
          className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
            badge.earned ? "border-brand-gold-300 bg-brand-gold-100/40" : "opacity-60"
          }`}
        >
          <Award
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              badge.earned ? "text-brand-gold-700" : "text-muted-foreground"
            }`}
            aria-hidden
          />
          <div>
            <p className="font-semibold">{badge.label}</p>
            <p className="text-xs text-muted-foreground">
              {badge.earned ? "Conquistada" : badge.hint}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
