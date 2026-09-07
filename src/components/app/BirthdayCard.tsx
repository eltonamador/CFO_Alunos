import { Cake } from "lucide-react";
import {
  formatBirthdayDate,
  type BirthdayAlert,
} from "@/modules/student-profile/domain/birthdayAlerts";

export function BirthdayCard({ alerts }: { alerts: BirthdayAlert[] }) {
  return (
    <section
      aria-labelledby="birthday-card-title"
      className="space-y-4 rounded-xl border bg-card p-5 shadow-card-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gold-100 text-brand-gold-700 dark:bg-brand-gold-700/20 dark:text-brand-gold-300">
          <Cake className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 id="birthday-card-title" className="font-display text-lg font-bold text-foreground">
            Aniversários
          </h2>
          <p className="text-xs text-muted-foreground">Cadetes aniversariantes de hoje e amanhã.</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Nenhum aniversário hoje ou amanhã.
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => {
            const isToday = alert.period === "today";
            return (
              <li
                key={alert.studentId}
                className="rounded-lg border border-brand-gold-300/50 bg-brand-gold-100/35 px-4 py-3 dark:bg-brand-gold-700/10"
              >
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{isToday ? "🎂 Hoje:" : "🎉 Amanhã:"}</span>{" "}
                  Cadete {alert.cadetName} —{" "}
                  {isToday ? `${alert.age} anos` : `fará ${alert.age} anos`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBirthdayDate(alert.occurrenceDate)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
