import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";

export type StudentSituation =
  | "matriculado"
  | "apresentado"
  | "afastado"
  | "desligado"
  | "concluido";

interface ClassGroupProps {
  courseId: string;
  name: string;
  startDate?: Date;
  endDate?: Date;
}

export class ClassGroup extends Entity<ClassGroupProps> {
  get courseId(): string {
    return this.props.courseId;
  }
  get name(): string {
    return this.props.name;
  }
  get startDate(): Date | undefined {
    return this.props.startDate;
  }
  get endDate(): Date | undefined {
    return this.props.endDate;
  }

  static create(props: ClassGroupProps, id?: UniqueId): ClassGroup {
    return new ClassGroup(props, id);
  }
}
