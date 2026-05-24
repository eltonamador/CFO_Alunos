import type { UseCase } from "@/shared/application/UseCase";
import type { Result } from "@/shared/domain";
import { ok, err, domainEvents } from "@/shared/domain";
import type { IStudentRepository } from "../../domain/ports/IStudentRepository";
import type { StudentProps, StudentReadonlyField } from "../../domain/entities/Student";
import { STUDENT_READONLY_FOR_ALUNO } from "../../domain/entities/Student";
import { createStudentProfileUpdated } from "../../domain/events/StudentProfileUpdated";
import type { UserRoleValue } from "@/shared/domain";

type Input = {
  studentId: string;
  updatedBy: string;
  actorRole: UserRoleValue;
  data: Partial<StudentProps>;
};

export class UpdateStudentProfile implements UseCase<Input, void> {
  constructor(private readonly repo: IStudentRepository) {}

  async execute({ studentId, updatedBy, actorRole, data }: Input): Promise<Result<void>> {
    const student = await this.repo.findById(studentId);
    if (!student) return err("Aluno não encontrado");

    // Aluno não pode alterar campos protegidos
    if (actorRole === "aluno") {
      const forbidden = STUDENT_READONLY_FOR_ALUNO.filter(
        (f) => f in data,
      ) as StudentReadonlyField[];
      if (forbidden.length > 0) {
        return err(`Campos não editáveis pelo aluno: ${forbidden.join(", ")}`);
      }
    }

    const changedFields = Object.keys(data);
    student.updateProfile(data);
    await this.repo.save(student);

    await domainEvents.publish(
      createStudentProfileUpdated(studentId, updatedBy, changedFields),
    );

    return ok(undefined);
  }
}
