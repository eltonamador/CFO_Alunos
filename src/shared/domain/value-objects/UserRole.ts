import { ValueObject } from "../ValueObject";
import { type Result, ok, err } from "../Result";

export type UserRoleValue = "coordenacao" | "secretaria" | "instrutor" | "aluno";

interface UserRoleProps {
  value: UserRoleValue;
}

export class UserRole extends ValueObject<UserRoleProps> {
  get value(): UserRoleValue {
    return this.props.value;
  }

  isCoordenacao(): boolean {
    return this.props.value === "coordenacao";
  }

  isSecretaria(): boolean {
    return this.props.value === "secretaria";
  }

  isInstrutor(): boolean {
    return this.props.value === "instrutor";
  }

  isAluno(): boolean {
    return this.props.value === "aluno";
  }

  /** Coordenação e Secretaria têm acesso administrativo */
  hasAdminAccess(): boolean {
    return this.props.value === "coordenacao" || this.props.value === "secretaria";
  }

  canSeeHealthDetails(): boolean {
    return this.props.value === "coordenacao";
  }

  canValidateDocuments(): boolean {
    return this.props.value === "coordenacao" || this.props.value === "secretaria";
  }

  canSeeSensitiveDocuments(): boolean {
    return this.props.value === "coordenacao" || this.props.value === "secretaria";
  }

  label(): string {
    const labels: Record<UserRoleValue, string> = {
      coordenacao: "Coordenação",
      secretaria: "Secretaria",
      instrutor: "Instrutor",
      aluno: "Aluno",
    };
    return labels[this.props.value];
  }

  static create(raw: string): Result<UserRole> {
    const valid: UserRoleValue[] = ["coordenacao", "secretaria", "instrutor", "aluno"];
    if (!valid.includes(raw as UserRoleValue)) {
      return err(`Perfil inválido: "${raw}". Use: ${valid.join(", ")}`);
    }
    return ok(new UserRole({ value: raw as UserRoleValue }));
  }
}
