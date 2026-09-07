import {
  formatBirthdayDate,
  type BirthdayAlert,
} from "@/modules/student-profile/domain/birthdayAlerts";

export function BirthdayBanner({ alerts }: { alerts: BirthdayAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Avisos de aniversário"
      className="-mx-4 -mt-6 mb-6 border-b border-brand-gold-300/70 bg-brand-gold-100/70 px-4 py-2.5 text-ink-800 dark:border-brand-gold-700/50 dark:bg-brand-gold-700/15 dark:text-brand-gold-100 md:-mx-8 md:-mt-8 md:px-8"
    >
      <div className="space-y-0.5 text-sm">
        {alerts.map((alert) => {
          const isToday = alert.period === "today";
          return (
            <p key={alert.studentId}>
              <span className="font-semibold">
                {isToday ? "🎂 Hoje é aniversário" : "🎉 Amanhã é aniversário"}
              </span>{" "}
              do Cadete {alert.cadetName} — {alert.age} anos ·{" "}
              <span className="tabular-nums">{formatBirthdayDate(alert.occurrenceDate)}</span>.
            </p>
          );
        })}
      </div>
    </div>
  );
}
