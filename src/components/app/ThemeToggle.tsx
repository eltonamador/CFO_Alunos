"use client";

import { Moon, Sun } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps extends Omit<ButtonProps, "children" | "onClick" | "type"> {
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = true, ...props }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Tema claro" : "Tema escuro";

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className={cn(showLabel ? "justify-start" : "shrink-0", className)}
      {...props}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
      {showLabel && <span>{label}</span>}
    </Button>
  );
}
