import { Clock } from "lucide-react";

export function PlaceholderTab({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Clock className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-display text-base font-semibold uppercase tracking-[0.02em] text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Será entregue em <span className="font-semibold text-foreground">{phase}</span>.
        </p>
      </div>
    </div>
  );
}
