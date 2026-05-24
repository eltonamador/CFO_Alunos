import { ValueObject } from "../ValueObject";
import { type Result, ok, err } from "../Result";

interface CourseCodeProps {
  value: string;
}

export class CourseCode extends ValueObject<CourseCodeProps> {
  get value(): string {
    return this.props.value;
  }

  static create(raw: string): Result<CourseCode> {
    const normalized = raw.trim().toUpperCase();
    if (normalized.length < 2 || /\s/.test(normalized)) {
      return err("Código do curso não pode ter espaços e deve ter ao menos 2 caracteres");
    }
    return ok(new CourseCode({ value: normalized }));
  }
}
