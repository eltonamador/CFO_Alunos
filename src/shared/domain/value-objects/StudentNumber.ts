import { ValueObject } from "../ValueObject";
import { type Result, ok, err } from "../Result";

interface StudentNumberProps {
  value: number;
}

export class StudentNumber extends ValueObject<StudentNumberProps> {
  get value(): number {
    return this.props.value;
  }

  /** Zero-padded para exibição: "007" */
  formatted(pad = 3): string {
    return String(this.props.value).padStart(pad, "0");
  }

  static create(value: number): Result<StudentNumber> {
    if (!Number.isInteger(value) || value <= 0) {
      return err("Número do aluno deve ser inteiro positivo");
    }
    return ok(new StudentNumber({ value }));
  }
}
