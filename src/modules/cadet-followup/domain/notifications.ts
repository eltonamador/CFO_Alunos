/**
 * Conteúdo e seleção dos avisos de FO− enviados ao cadete.
 *
 * O prazo é de 24 horas: o aviso passivo (badge e alerta no painel) só
 * funciona se ele abrir o app. Aqui ficam as duas ocasiões em que vale
 * interromper o cadete — quando o FO− é registrado e quando o prazo está
 * perto de vencer sem manifestação.
 */
import type { NotificationContent } from "@/modules/notifications/domain/types";
import { remainingTime, type FollowUpStatus } from "./followUp";

export const FOLLOW_UP_NOTIFICATION_KINDS = ["registrado", "prazo_proximo"] as const;
export type FollowUpNotificationKind = (typeof FOLLOW_UP_NOTIFICATION_KINDS)[number];

/**
 * Horas restantes a partir das quais vale lembrar o cadete.
 *
 * Conversa com a cadência do cron: como ele roda uma vez por dia, uma
 * janela curta demais deixaria a maior parte dos FO− sem lembrete algum.
 * Com 12 horas, todo FO− aberto passa por uma execução do cron dentro da
 * sua janela — e a unicidade do ledger garante que o lembrete saia uma
 * única vez por registro, sem virar insistência.
 */
export const REMINDER_THRESHOLD_HOURS = 12;

export interface NotifiableRecord {
  id: string;
  studentId: string;
  reasonText: string;
  status: FollowUpStatus;
  deadlineAt: string | null;
}

export function buildFollowUpNotification(
  record: NotifiableRecord,
  kind: FollowUpNotificationKind,
  now: Date = new Date(),
): NotificationContent {
  const url = `/aluno/acompanhamento/${record.id}`;
  const tag = `fo-${record.id}-${kind}`;

  if (kind === "registrado") {
    return {
      title: "FO− registrado",
      body: `${record.reasonText} — você tem 24 horas para apresentar sua manifestação.`,
      url,
      tag,
    };
  }

  const remaining = record.deadlineAt ? remainingTime(record.deadlineAt, now) : null;
  const prazo = remaining && !remaining.expired ? remaining.label : "pouco tempo";

  return {
    title: "Prazo de manifestação acabando",
    body: `${record.reasonText} — ${prazo} para apresentar sua justificativa.`,
    url,
    tag,
  };
}

/**
 * FO− que ainda podem ser respondidos e estão dentro da janela final.
 * Já vencidos ficam de fora: para esses o aviso não serve de nada, e a
 * varredura de prazo já cuida do que acontece depois.
 */
export function selectDeadlineReminders(
  records: NotifiableRecord[],
  now: Date = new Date(),
  hoursBefore: number = REMINDER_THRESHOLD_HOURS,
): NotifiableRecord[] {
  const windowMs = hoursBefore * 60 * 60 * 1000;

  return records.filter((record) => {
    if (record.status !== "aguardando_manifestacao") return false;
    if (!record.deadlineAt) return false;

    const remainingMs = new Date(record.deadlineAt).getTime() - now.getTime();
    if (Number.isNaN(remainingMs)) return false;
    return remainingMs > 0 && remainingMs <= windowMs;
  });
}
