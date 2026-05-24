"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  param?: string; // query param name (default: "tab")
  defaultValue: string;
}

/**
 * Tabs URL-driven. Funciona como links — preserva SSR e refresh.
 */
export function Tabs({ items, param = "tab", defaultValue }: TabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) ?? defaultValue;

  return (
    <div
      role="tablist"
      className="-mx-4 flex gap-0 overflow-x-auto border-b border-border bg-card px-4 md:mx-0 md:rounded-t-md md:px-2"
    >
      {items.map((item) => {
        const params = new URLSearchParams(searchParams);
        params.set(param, item.value);
        const isActive = current === item.value;
        return (
          <Link
            key={item.value}
            href={`${pathname}?${params.toString()}`}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative whitespace-nowrap px-3 py-3 font-display text-sm font-semibold uppercase tracking-[0.06em] transition-colors",
              "after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-t-sm after:transition-colors",
              isActive
                ? "text-primary after:bg-primary"
                : "text-foreground/75 hover:bg-secondary hover:text-foreground after:bg-transparent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
