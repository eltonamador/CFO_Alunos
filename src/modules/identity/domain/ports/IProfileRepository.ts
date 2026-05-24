import type { Profile } from "../entities/Profile";
import type { UserRoleValue } from "@/shared/domain";

export interface IProfileRepository {
  findById(userId: string): Promise<Profile | null>;
  findByStudentId(studentId: string): Promise<Profile | null>;
  findAllByRole(role: UserRoleValue): Promise<Profile[]>;
  save(profile: Profile): Promise<void>;
  markPasswordChanged(userId: string): Promise<void>;
}
