"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "sidebar" | "bottom";
  exact?: boolean;
  badge?: number;
}

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 9 ? "9+" : String(count);
  return (
    <span
      aria-label={`${count} não lido${count > 1 ? "s" : ""}`}
      className={cn(
        "absolute flex items-center justify-center rounded-full bg-red-500 font-sans font-bold leading-none text-white",
        count > 9
          ? "right-[-6px] top-[-4px] h-4 min-w-[1rem] px-1 text-[9px]"
          : "right-[-5px] top-[-4px] h-4 w-4 text-[9px]",
      )}
    >
      {label}
    </span>
  );
}

export function NavLink({ href, label, icon, variant = "sidebar", exact, badge = 0 }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);

  if (variant === "bottom") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        className={cn(
          "relative flex h-full flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          active
            ? "text-primary"
            : "text-foreground/70 hover:bg-secondary hover:text-foreground",
        )}
      >
        {active && (
          <span aria-hidden className="absolute top-0 h-[3px] w-10 rounded-b-full bg-primary" />
        )}
        <span className="relative">
          {icon}
          <UnreadDot count={badge} />
        </span>
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#16140f]",
        active
          ? "bg-[#8b1a1f] text-white shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          : "text-white/85 hover:bg-white/10 hover:text-white",
      )}
    >
      {icon && (
        <span className={cn("relative transition-transform", active ? "text-white" : "text-white/70 group-hover:text-white")}>
          {icon}
          <UnreadDot count={badge} />
        </span>
      )}
      <span>{label}</span>
    </Link>
  );
}
