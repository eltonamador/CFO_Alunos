import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Pill / Status badge — institucional CBMAP.
 * Uppercase, letter-spacing, fontes em Barlow (semibold).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase leading-none tracking-[0.04em] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300",
        primary: "border-transparent bg-brand-red-50 text-brand-red-700 dark:bg-brand-red-900/30 dark:text-brand-red-100",
        success: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        warning: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        destructive: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        info: "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
        gold: "border-transparent bg-brand-gold-100 text-brand-gold-700 dark:bg-brand-gold-700/20 dark:text-brand-gold-300",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
