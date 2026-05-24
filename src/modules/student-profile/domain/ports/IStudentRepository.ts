import type { Student } from "../entities/Student";

export interface StudentListItem {
  id: string;
  studentNumber?: number;
  warName: string;
  fullName: string;
  pelotao?: string;
  photoPath?: string;
  situation: string;
  // Badges/status derivados
  hasPendingValidation: boolean;
  hasHealthRestriction: boolean;
  cangaWarName?: string;
}

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findByClassId(classId: string): Promise<StudentListItem[]>;
  search(classId: string, query: string): Promise<StudentListItem[]>;
  save(student: Student): Promise<void>;
  create(student: Student): Promise<void>;
}
