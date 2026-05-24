import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";

export type AuditAction =
  | "insert"
  | "update"
  | "delete"
  | "validate"
  | "reject"
  | "view_emergency_contact";

interface AuditLogProps {
  actorId?: string;
  actorRole?: string;
  entity: string;
  entityId?: string;
  action: AuditAction;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  reason?: string;
  createdAt: Date;
}

export class AuditLog extends Entity<AuditLogProps> {
  get actorId(): string | undefined { return this.props.actorId; }
  get entity(): string { return this.props.entity; }
  get entityId(): string | undefined { return this.props.entityId; }
  get action(): AuditAction { return this.props.action; }
  get beforeData(): Record<string, unknown> | undefined { return this.props.beforeData; }
  get afterData(): Record<string, unknown> | undefined { return this.props.afterData; }
  get createdAt(): Date { return this.props.createdAt; }

  static create(props: Omit<AuditLogProps, "createdAt">, id?: UniqueId): AuditLog {
    return new AuditLog({ ...props, createdAt: new Date() }, id);
  }
}
