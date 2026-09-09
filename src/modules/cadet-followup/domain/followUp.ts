/**
 * Acompanhamento do Cadete — regras puras do MVP (FO− / FO+).
 *
 * Este arquivo não conhece Supabase nem React: só tipos, rótulos e as
 * duas regras que realmente têm lógica (normalização de motivo para o
 * autocomplete e o prazo de 24 horas da manifestação).
 */

export const FOLLOW_UP_TYPES = [
  "fo_negativo",
  "fo_positivo",
  "saude",
  "missao",
  "administrativo",
] as const;

export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export const FOLLOW_UP_TYPE_LABELS: Record<FollowUpType, string> = {
  fo_negativo: "FO−",
  fo_positivo: "FO+",
  saude: "Saúde/Afastamento",
  missao: "Missão/Atividade",
  administrativo: "Administrativo/Outro",
};

/** Rótulo por extenso — usado em telas de detalhe e na linha do tempo. */
export const FOLLOW_UP_TYPE_FULL_LABELS: Record<FollowUpType, string> = {
  fo_negativo: "FO− · Fato Observado Negativo",
  fo_positivo: "FO+ · Fato Observado Positivo",
  saude: "Saúde/Afastamento",
  missao: "Missão/Atividade",
  administrativo: "Administrativo/Outro",
};

export const FOLLOW_UP_STATUSES = [
  "registrado",
  "aguardando_manifestacao",
  "aguardando_analise",
  "prazo_expirado",
  "deferido",
  "indeferido",
  "aguardando_cumprimento",
  "concluido",
  "cancelado",
] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  registrado: "Registrado",
  aguardando_manifestacao: "Aguardando manifestação",
  aguardando_analise: "Aguardando análise",
  prazo_expirado: "Prazo expirado",
  deferido: "Deferido",
  indeferido: "Indeferido",
  aguardando_cumprimento: "Aguardando cumprimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PUNISHMENT_STATUSES = [
  "aguardando_cumprimento",
  "cumprida",
  "parcialmente_cumprida",
  "nao_cumprida",
  "cancelada",
] as const;

export type PunishmentStatus = (typeof PUNISHMENT_STATUSES)[number];

export const PUNISHMENT_STATUS_LABELS: Record<PunishmentStatus, string> = {
  aguardando_cumprimento: "Aguardando cumprimento",
  cumprida: "Cumprida",
  parcialmente_cumprida: "Parcialmente cumprida",
  nao_cumprida: "Não cumprida",
  cancelada: "Cancelada",
};

/** Somente o FO− abre prazo de manifestação no MVP. */
export function requiresManifestation(type: FollowUpType): boolean {
  return type === "fo_negativo";
}

/** Status inicial de um registro recém-criado. */
export function initialStatus(type: FollowUpType): FollowUpStatus {
  return requiresManifestation(type) ? "aguardando_manifestacao" : "registrado";
}

export const MANIFESTATION_WINDOW_HOURS = 24;

export function deadlineFrom(start: Date): Date {
  return new Date(start.getTime() + MANIFESTATION_WINDOW_HOURS * 60 * 60 * 1000);
}

export interface RemainingTime {
  expired: boolean;
  /** Ex.: "18h32 restantes" ou "Prazo encerrado — manifestação não apresentada." */
  label: string;
  /** Minutos restantes (0 quando encerrado) — útil para destacar urgência. */
  minutesLeft: number;
}

/**
 * Texto simples do prazo, como pedido no MVP: "18h32 restantes".
 * Abaixo de 1 hora mostra apenas os minutos.
 */
export function remainingTime(deadline: Date | string, now: Date = new Date()): RemainingTime {
  const target = typeof deadline === "string" ? new Date(deadline) : deadline;
  const diffMs = target.getTime() - now.getTime();

  if (Number.isNaN(target.getTime())) {
    return { expired: false, label: "Prazo não definido", minutesLeft: 0 };
  }

  if (diffMs <= 0) {
    return {
      expired: true,
      label: "Prazo encerrado — manifestação não apresentada.",
      minutesLeft: 0,
    };
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const label =
    hours > 0
      ? `${hours}h${String(minutes).padStart(2, "0")} restantes`
      : `${minutes} min restantes`;

  return { expired: false, label, minutesLeft: totalMinutes };
}

/**
 * Chave de deduplicação dos catálogos aprendidos (motivos e punições).
 * Espelha `public.normalize_label()` no banco: minúsculas, sem acento,
 * sem pontuação e com espaços colapsados.
 *
 * Serve para reaproveitar um motivo já existente quando o texto é
 * equivalente — nunca para bloquear o registro de um motivo novo.
 */
export function normalizeLabel(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ordena sugestões: prefixo primeiro, depois mais usadas, depois mais recentes. */
export interface ReasonSuggestion {
  id: string;
  label: string;
  usageCount: number;
  lastUsedAt: string | null;
}

export function rankSuggestions(
  suggestions: ReasonSuggestion[],
  term: string,
  limit = 8,
): ReasonSuggestion[] {
  const needle = normalizeLabel(term);
  if (!needle) {
    return [...suggestions]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  return suggestions
    .map((item) => {
      const haystack = normalizeLabel(item.label);
      const index = haystack.indexOf(needle);
      return { item, index };
    })
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      if (a.item.usageCount !== b.item.usageCount) return b.item.usageCount - a.item.usageCount;
      return a.item.label.localeCompare(b.item.label, "pt-BR");
    })
    .slice(0, limit)
    .map((entry) => entry.item);
}
