import { ValueObject } from "../ValueObject";
import { type Result, ok, err } from "../Result";

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  get value(): string {
    return this.props.value;
  }

  static create(raw: string): Result<Email> {
    const normalized = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return err("E-mail inválido");
    }
    return ok(new Email({ value: normalized }));
  }
}
