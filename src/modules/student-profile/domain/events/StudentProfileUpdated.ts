import type { DomainEvent } from "@/shared/domain";

export interface StudentProfileUpdated extends DomainEvent {
  readonly eventName: "student-profile.updated";
  readonly studentId: string;
  readonly updatedBy: string;
  readonly changedFields: string[];
}

export function createStudentProfileUpdated(
  studentId: string,
  updatedBy: string,
  changedFields: string[],
): StudentProfileUpdated {
  return {
    eventName: "student-profile.updated",
    occurredAt: new Date(),
    studentId,
    updatedBy,
    changedFields,
  };
}
