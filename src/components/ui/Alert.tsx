import * as React from "react";
import { cn } from "@/lib/utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success";
}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  const variants = {
    default: "border-border bg-muted text-foreground",
    destructive: "border-destructive/50 bg-destructive/10 text-destructive",
    success: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
  };
  return (
    <div
      role="alert"
      className={cn("rounded-md border px-4 py-3 text-sm", variants[variant], className)}
      {...props}
    />
  );
}
