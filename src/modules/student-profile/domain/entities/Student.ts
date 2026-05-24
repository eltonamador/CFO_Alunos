import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";
import type { StudentNumber } from "@/shared/domain";
import type { StudentSituation } from "@/modules/course-management/domain/entities/ClassGroup";

export type Sex = "M" | "F";

export interface StudentProps {
  classId: string;
  pelotao?: string;
  studentNumber?: StudentNumber;
  situation: StudentSituation;
  fullName: string;
  warName: string; // nome de guerra
  sex?: Sex;
  birthDate?: Date;
  nationality?: string;
  naturalityState?: string;
  naturalityCity?: string;
  maritalStatus?: string;
  educationLevel?: string;
  graduationType?: string;
  enrollmentId?: string; // matrícula
  cpf?: string;
  rg?: string;
  pis?: string;
  voterId?: string;
  voterZone?: string;
  voterSection?: string;
  fatherName?: string;
  motherName?: string;
  presentationDate?: Date;
  photoPath?: string;
  religion?: string;
  religionOther?: string;
  hasReligiousRestriction?: boolean;
  religiousRestrictionNotes?: string;
}

/** Campos que o Aluno NÃO pode alterar — apenas Coordenação. */
export const STUDENT_READONLY_FOR_ALUNO = [
  "classId",
  "pelotao",
  "studentNumber",
  "situation",
] as const;

export type StudentReadonlyField = (typeof STUDENT_READONLY_FOR_ALUNO)[number];

export class Student extends Entity<StudentProps> {
  get classId(): string { return this.props.classId; }
  get pelotao(): string | undefined { return this.props.pelotao; }
  get studentNumber(): StudentNumber | undefined { return this.props.studentNumber; }
  get situation(): StudentSituation { return this.props.situation; }
  get fullName(): string { return this.props.fullName; }
  get warName(): string { return this.props.warName; }
  get sex(): Sex | undefined { return this.props.sex; }
  get birthDate(): Date | undefined { return this.props.birthDate; }
  get cpf(): string | undefined { return this.props.cpf; }
  get rg(): string | undefined { return this.props.rg; }
  get photoPath(): string | undefined { return this.props.photoPath; }
  get religion(): string | undefined { return this.props.religion; }
  get religionOther(): string | undefined { return this.props.religionOther; }
  get hasReligiousRestriction(): boolean | undefined { return this.props.hasReligiousRestriction; }
  get religiousRestrictionNotes(): string | undefined { return this.props.religiousRestrictionNotes; }

  updateProfile(partial: Partial<Omit<StudentProps, StudentReadonlyField>>): void {
    this.props = { ...this.props, ...partial };
  }

  /** Apenas Coordenação */
  assignNumber(num: StudentNumber): void {
    this.props = { ...this.props, studentNumber: num };
  }

  /** Apenas Coordenação */
  assignPelotao(pelotao: string): void {
    this.props = { ...this.props, pelotao };
  }

  /** Apenas Coordenação */
  changeSituation(situation: StudentSituation): void {
    this.props = { ...this.props, situation };
  }

  static create(props: StudentProps, id?: UniqueId): Student {
    return new Student(props, id);
  }
}
