import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Rótulo de seção institucional — letras pequenas, maiúsculas, vermelho-CBMAP.
 * Uso: <SectionEyebrow>Identificação</SectionEyebrow>
 */
export function SectionEyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-primary",
        className,
      )}
      {...props}
    />
  );
}
