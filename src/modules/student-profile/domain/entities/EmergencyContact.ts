import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";

export type ContactPriority = 1 | 2;

interface EmergencyContactProps {
  studentId: string;
  priority: ContactPriority;
  fullName: string;
  relationship?: string;
  phone: string;
  address?: string;
  notes?: string;
}

export class EmergencyContact extends Entity<EmergencyContactProps> {
  get studentId(): string { return this.props.studentId; }
  get priority(): ContactPriority { return this.props.priority; }
  get fullName(): string { return this.props.fullName; }
  get relationship(): string | undefined { return this.props.relationship; }
  get phone(): string { return this.props.phone; }
  get address(): string | undefined { return this.props.address; }

  static create(props: EmergencyContactProps, id?: UniqueId): EmergencyContact {
    return new EmergencyContact(props, id);
  }
}
