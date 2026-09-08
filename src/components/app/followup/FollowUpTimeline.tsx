import { formatDateTime } from "./format";

interface TimelineEvent {
  id: string;
  eventType: string;
  description: string | null;
  actorName: string | null;
  createdAt: string;
}

const EVENT_LABELS: Record<string, string> = {
  registrado: "Registrado",
  manifestacao_enviada: "Manifestação enviada",
  prazo_expirado: "Prazo expirado",
  decisao: "Decisão da Coordenação",
  punicao_definida: "Punição definida",
  punicao_atualizada: "Cumprimento atualizado",
  cancelado: "Cancelado",
};

/** Histórico do próprio registro — o que aconteceu e quando. */
export function FollowUpTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="relative border-l border-border pl-4">
          <span
            className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary"
            aria-hidden
          />
          <p className="font-display text-sm font-semibold uppercase tracking-[0.04em]">
            {EVENT_LABELS[event.eventType] ?? event.eventType}
          </p>
          {event.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
          )}
          <p className="num-mono mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(event.createdAt)}
            {event.actorName ? ` · ${event.actorName}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
