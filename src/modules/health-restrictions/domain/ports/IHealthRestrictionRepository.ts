import type { HealthRestriction } from "../entities/HealthRestriction";

/** Projeção segura para o Instrutor — sem dados clínicos. */
export interface HealthRestrictionInstructorView {
  studentId: string;
  hasRestriction: boolean;
  operationalSummary?: string;
}

export interface IHealthRestrictionRepository {
  findByStudentId(studentId: string): Promise<HealthRestriction | null>;
  findInstructorView(studentId: string): Promise<HealthRestrictionInstructorView | null>;
  save(restriction: HealthRestriction): Promise<void>;
  findPendingValidation(): Promise<HealthRestriction[]>;
}
