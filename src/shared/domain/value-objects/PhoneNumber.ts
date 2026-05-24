import { ValueObject } from "../ValueObject";
import { type Result, ok, err } from "../Result";

interface PhoneNumberProps {
  value: string; // dígitos apenas, incluindo DDD, sem país
}

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  get value(): string {
    return this.props.value;
  }

  /** Formata como (XX) XXXXX-XXXX */
  formatted(): string {
    const d = this.props.value;
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return d;
  }

  /** Link tel: para WhatsApp / chamada (E.164 BR) */
  toE164(): string {
    return `+55${this.props.value}`;
  }

  whatsappLink(): string {
    return `https://wa.me/55${this.props.value}`;
  }

  static create(raw: string): Result<PhoneNumber> {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      return err("Telefone deve ter 10 ou 11 dígitos (com DDD)");
    }
    return ok(new PhoneNumber({ value: digits }));
  }
}
