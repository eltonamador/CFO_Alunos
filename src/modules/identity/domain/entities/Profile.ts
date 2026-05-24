import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";
import type { UserRole } from "@/shared/domain";

export interface ProfileProps {
  userId: string;
  role: UserRole;
  fullName: string;
  active: boolean;
  studentId?: string; // apenas para role=aluno
  passwordChangedAt?: Date;
}

export class Profile extends Entity<ProfileProps> {
  get userId(): string {
    return this.props.userId;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get fullName(): string {
    return this.props.fullName;
  }
  get active(): boolean {
    return this.props.active;
  }
  get studentId(): string | undefined {
    return this.props.studentId;
  }

  isFirstAccess(): boolean {
    return !this.props.passwordChangedAt;
  }

  deactivate(): void {
    this.props = { ...this.props, active: false };
  }

  static create(props: ProfileProps, id?: UniqueId): Profile {
    return new Profile(props, id);
  }
}
