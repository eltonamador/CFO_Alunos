import { dutyWindow } from "./dutyWindow";

export type ReminderSlot = "evening" | "morning";

export function reminderWindow(slot: ReminderSlot, now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Belem",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  // O cron Hobby pode iniciar em qualquer minuto da hora agendada.
  if (hour !== (slot === "evening" ? 18 : 6)) return null;
  const dates = dutyWindow(now);
  return {
    date: slot === "evening" ? dates.tomorrow : dates.today,
    label: slot === "evening" ? "amanhã" : "hoje",
  };
}

export function reminderContent(date: string, slot: ReminderSlot, duties: string[]) {
  const label = slot === "evening" ? "amanhã" : "hoje";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
  return {
    title: `Você está de serviço ${label}`,
    body: `${dateLabel}: ${[...new Set(duties)].join("; ")}. Consulte a equipe e a escala atualizada.`,
    url: "/escalas/calendario?filtro=minhas",
    tag: `duty-reminder-${date}-${slot}`,
  };
}
