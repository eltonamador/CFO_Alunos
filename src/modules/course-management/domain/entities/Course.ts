import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";
import type { CourseCode } from "@/shared/domain";

interface CourseProps {
  code: CourseCode;
  name: string;
  year: number;
}

export class Course extends Entity<CourseProps> {
  get code(): CourseCode {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get year(): number {
    return this.props.year;
  }

  static create(props: CourseProps, id?: UniqueId): Course {
    return new Course(props, id);
  }
}
