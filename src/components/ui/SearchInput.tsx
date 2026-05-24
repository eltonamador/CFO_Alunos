"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input, type InputProps } from "./Input";

interface SearchInputProps extends Omit<InputProps, "onChange" | "value"> {
  param?: string;
  debounceMs?: number;
}

export function SearchInput({
  param = "q",
  debounceMs = 250,
  placeholder = "Buscar...",
  ...rest
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(sp.get(param) ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams(sp);
      if (value) params.set(param, value);
      else params.delete(param);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, debounceMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      {...rest}
    />
  );
}
