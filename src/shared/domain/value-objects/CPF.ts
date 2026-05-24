import { ValueObject } from "../ValueObject";
import { type Result, ok, err } from "../Result";

interface CPFProps {
  value: string; // somente dígitos, 11 chars
}

export class CPF extends ValueObject<CPFProps> {
  get value(): string {
    return this.props.value;
  }

  /** Formata para exibição: 000.000.000-00 */
  formatted(): string {
    return this.props.value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  static create(raw: string): Result<CPF> {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 11) return err("CPF deve ter 11 dígitos");
    if (/^(\d)\1+$/.test(digits)) return err("CPF inválido (dígitos repetidos)");
    if (!CPF.validateDigits(digits)) return err("CPF inválido");
    return ok(new CPF({ value: digits }));
  }

  private static validateDigits(d: string): boolean {
    const calc = (len: number) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
      const rem = (sum * 10) % 11;
      return rem === 10 || rem === 11 ? 0 : rem;
    };
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  }
}
