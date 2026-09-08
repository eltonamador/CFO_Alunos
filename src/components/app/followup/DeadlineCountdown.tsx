"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { remainingTime } from "@/modules/cadet-followup/domain/followUp";

/**
 * Prazo de manifestação em texto simples ("18h32 restantes").
 * Recalcula a cada minuto para não exigir refresh da página.
 */
export function DeadlineCountdown({
  deadline,
  className,
}: {
  deadline: string;
  className?: string;
}) {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = remainingTime(deadline, now);
  const urgent = !remaining.expired && remaining.minutesLeft <= 180;

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-sm font-semibold",
        remaining.expired
          ? "text-destructive"
          : urgent
            ? "text-amber-700 dark:text-amber-400"
            : "text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-4 w-4 shrink-0" aria-hidden />
      {remaining.expired ? remaining.label : `Prazo para manifestação: ${remaining.label}`}
    </p>
  );
}
