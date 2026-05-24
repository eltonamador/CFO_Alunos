import type { AuditLog } from "../entities/AuditLog";

export interface IAuditRepository {
  log(entry: AuditLog): Promise<void>;
  findByEntityId(entity: string, entityId: string, limit?: number): Promise<AuditLog[]>;
  findByStudentId(studentId: string, limit?: number): Promise<AuditLog[]>;
}
