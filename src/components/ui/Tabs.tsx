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
    <div className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0">
      {items.map((item) => {
        const params = new URLSearchParams(searchParams);
        params.set(param, item.value);
        const isActive = current === item.value;
        return (
          <Link
            key={item.value}
            href={`${pathname}?${params.toString()}`}
            scroll={false}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
