import type { CangaAssignment } from "../entities/CangaAssignment";

export interface ICangaAssignmentRepository {
  findCurrentByStudentId(studentId: string): Promise<CangaAssignment | null>;
  findHistoryByStudentId(studentId: string): Promise<CangaAssignment[]>;
  deactivateCurrent(studentId: string): Promise<void>;
  save(assignment: CangaAssignment): Promise<void>;
}
