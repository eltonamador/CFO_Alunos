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
}

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href, label, icon, variant = "sidebar", exact }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);

  if (variant === "bottom") {
    return (
      <Link
        href={href}
        className={cn(
          "flex h-full flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {icon}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-brand-red-700 text-white"
          : "text-ink-200 hover:bg-ink-800 hover:text-white",
      )}
    >
      {icon && <span className="opacity-80 group-hover:opacity-100">{icon}</span>}
      <span>{label}</span>
    </Link>
  );
}
