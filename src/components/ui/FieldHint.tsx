import * as React from "react";

/** Mensagem auxiliar abaixo de um input (hint ou erro). */
export function FieldHint({
  children,
  tone = "muted",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "muted" | "error" | "success";
  className?: string;
}) {
  const toneClass =
    tone === "error"
      ? "text-red-600 dark:text-red-400"
      : tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-muted-foreground";
  return <p className={`text-[11px] leading-snug ${toneClass} ${className}`}>{children}</p>;
}

/** Asterisco discreto para indicar campo obrigatório. */
export function RequiredMark() {
  return (
    <span aria-hidden className="ml-0.5 text-red-600 dark:text-red-400">
      *
    </span>
  );
}
