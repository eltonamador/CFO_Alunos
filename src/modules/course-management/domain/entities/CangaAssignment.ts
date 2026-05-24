import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";

interface CangaAssignmentProps {
  studentId: string;
  cangaStudentId: string;
  assignedAt: Date;
  assignedBy: string; // userId
  isCurrent: boolean;
  notes?: string;
}

export class CangaAssignment extends Entity<CangaAssignmentProps> {
  get studentId(): string {
    return this.props.studentId;
  }
  get cangaStudentId(): string {
    return this.props.cangaStudentId;
  }
  get assignedAt(): Date {
    return this.props.assignedAt;
  }
  get assignedBy(): string {
    return this.props.assignedBy;
  }
  get isCurrent(): boolean {
    return this.props.isCurrent;
  }
  get notes(): string | undefined {
    return this.props.notes;
  }

  deactivate(): void {
    this.props = { ...this.props, isCurrent: false };
  }

  static create(props: CangaAssignmentProps, id?: UniqueId): CangaAssignment {
    if (props.studentId === props.cangaStudentId) {
      throw new Error("Um aluno não pode ser canga de si mesmo");
    }
    return new CangaAssignment(props, id);
  }
}
