import type { NotificationContent } from "@/modules/notifications/domain/types";

export interface ScheduleNotificationSource {
  eventType: string;
  eventId: string;
  dutyDate: string | null;
  dutyFunction: string | null;
  scheduleTypeName: string;
}

function formatDate(value: string | null) {
  if (!value) return "data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function scheduleNotificationContent(
  source: ScheduleNotificationSource,
): NotificationContent {
  const duty = source.dutyFunction || source.scheduleTypeName;
  const date = formatDate(source.dutyDate);
  if (source.eventType === "wrong_recipient_correction") {
    return {
      title: "Correção de escala",
      body: `Uma atribuição anterior de ${duty} em ${date} foi corrigida. Consulte suas escalas vigentes.`,
      url: "/aluno/escalas",
      tag: `schedule-${source.eventId}`,
    };
  }
  if (source.eventType === "assignment_cancelled") {
    return {
      title: "Escala cancelada",
      body: `A atribuição de ${duty} em ${date} foi cancelada.`,
      url: "/aluno/escalas",
      tag: `schedule-${source.eventId}`,
    };
  }
  return {
    title: source.eventType === "assignment_corrected" ? "Escala corrigida" : "Nova escala",
    body: `Você está escalado para ${duty} em ${date}.`,
    url: "/aluno/escalas",
    tag: `schedule-${source.eventId}`,
  };
}
