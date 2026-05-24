import type { UseCase } from "@/shared/application/UseCase";
import type { Result } from "@/shared/domain";
import { ok, err } from "@/shared/domain";
import { CangaAssignment } from "../../domain/entities/CangaAssignment";
import type { ICangaAssignmentRepository } from "../../domain/ports/ICangaAssignmentRepository";

type Input = {
  studentId: string;
  cangaStudentId: string;
  assignedBy: string;
  notes?: string;
};
type Output = CangaAssignment;

export class AssignCanga implements UseCase<Input, Output> {
  constructor(private readonly repo: ICangaAssignmentRepository) {}

  async execute(input: Input): Promise<Result<Output>> {
    if (input.studentId === input.cangaStudentId) {
      return err("Um aluno não pode ser canga de si mesmo");
    }

    // Desativar designação atual antes de criar a nova
    await this.repo.deactivateCurrent(input.studentId);

    const assignment = CangaAssignment.create({
      studentId: input.studentId,
      cangaStudentId: input.cangaStudentId,
      assignedAt: new Date(),
      assignedBy: input.assignedBy,
      isCurrent: true,
      notes: input.notes,
    });

    await this.repo.save(assignment);
    return ok(assignment);
  }
}
