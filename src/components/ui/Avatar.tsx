import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  square?: boolean;
}

const sizeMap = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-sm",
  xl: "h-20 w-20 text-base",
};

/**
 * Avatar institucional — foto do aluno OU iniciais sobre fundo vermelho-CBMAP.
 */
export function Avatar({
  src,
  alt,
  initials,
  size = "md",
  square,
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-primary font-display font-semibold uppercase tracking-[0.04em] text-primary-foreground",
        square ? "rounded-md" : "rounded-full",
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span>{initials ?? "?"}</span>
      )}
    </div>
  );
}
