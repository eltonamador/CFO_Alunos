export interface DutyWindow {
  today: string;
  tomorrow: string;
}

/** Datas civis da guarnição, sem depender do fuso do servidor da Vercel. */
export function dutyWindow(now = new Date()): DutyWindow {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { today, tomorrow: next.toISOString().slice(0, 10) };
}
