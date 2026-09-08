"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { rankSuggestions, type ReasonSuggestion } from "@/modules/cadet-followup/domain/followUp";

interface ReasonAutocompleteProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: ReasonSuggestion[];
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
}

/**
 * Campo de motivo com sugestões baseadas no que já foi registrado.
 *
 * Regra do MVP: a sugestão é um atalho, nunca uma trava — o usuário pode
 * ignorar a lista e escrever um motivo novo, que passa a alimentar as
 * sugestões seguintes.
 */
export function ReasonAutocomplete({
  id,
  name,
  value,
  onChange,
  suggestions,
  placeholder = "Ex.: Coturno sujo",
  autoFocus,
  required,
}: ReasonAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);

  const matches = React.useMemo(
    () => rankSuggestions(suggestions, value, 8),
    [suggestions, value],
  );

  const visible = open && matches.length > 0;

  function pick(label: string) {
    onChange(label);
    setOpen(false);
    setHighlight(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => (current + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => (current <= 0 ? matches.length - 1 : current - 1));
    } else if (event.key === "Enter" && highlight >= 0) {
      const chosen = matches[highlight];
      if (chosen) {
        event.preventDefault();
        pick(chosen.label);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        autoFocus={autoFocus}
        required={required}
        autoComplete="off"
        enterKeyHint="done"
        placeholder={placeholder}
        aria-expanded={visible}
        aria-autocomplete="list"
        role="combobox"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
      />

      {visible && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {matches.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                // onMouseDown roda antes do blur do input — garante o clique no mobile.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(item.label);
                }}
                className={cn(
                  "flex min-h-[44px] w-full items-center justify-between gap-3 px-3 text-left text-sm transition-colors",
                  index === highlight ? "bg-secondary" : "hover:bg-secondary",
                )}
              >
                <span className="truncate text-foreground">{item.label}</span>
                {item.usageCount > 0 && (
                  <span className="num-mono shrink-0 text-[11px] text-muted-foreground">
                    {item.usageCount}×
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
