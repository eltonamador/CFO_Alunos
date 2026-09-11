import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ScheduleAssignmentView } from "@/modules/schedule-repository/application/types";

function formatDate(value: string | null) {
  if (!value) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function UpcomingScheduleAssignments({
  assignments,
}: {
  assignments: ScheduleAssignmentView[];
}) {
  if (!assignments.length) return null;
  return (
    <section className="space-y-3" aria-labelledby="upcoming-schedules-title">
      <h2 id="upcoming-schedules-title" className="font-display text-xl font-semibold">
        Próximas atribuições
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="flex gap-3 p-4">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">
                {assignment.duty_function || assignment.schedule_type_name}
              </p>
              <p className="text-sm text-muted-foreground">{formatDate(assignment.duty_date)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{assignment.document_name}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
