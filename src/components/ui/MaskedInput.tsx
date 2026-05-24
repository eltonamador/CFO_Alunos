"use client";

import * as React from "react";
import { Input, type InputProps } from "@/components/ui/Input";
import { applyMask, type MaskKind } from "@/lib/masks";

export interface MaskedInputProps extends Omit<InputProps, "defaultValue" | "value" | "onChange"> {
  mask: MaskKind;
  defaultValue?: string | null;
  /** Callback opcional com o valor mascarado. */
  onValueChange?: (masked: string) => void;
  name: string;
}

/**
 * Input controlado que aplica máscara a cada tecla.
 * Envia o valor mascarado no form (compatível com server actions).
 */
export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, defaultValue, onValueChange, ...props }, ref) => {
    const [val, setVal] = React.useState(() => applyMask(mask, defaultValue ?? ""));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = applyMask(mask, e.target.value);
      setVal(next);
      onValueChange?.(next);
    };

    // inputMode mais adequado por tipo de máscara
    const inputMode =
      mask === "phone" || mask === "cpf" || mask === "cep" || mask === "voter"
        ? ("numeric" as const)
        : ("text" as const);

    return (
      <Input
        ref={ref}
        value={val}
        onChange={handleChange}
        inputMode={inputMode}
        autoComplete="off"
        {...props}
      />
    );
  },
);
MaskedInput.displayName = "MaskedInput";
