import type { SupabaseClient } from "@supabase/supabase-js";
import type { IProfileRepository } from "../domain/ports/IProfileRepository";
import type { Profile } from "../domain/entities/Profile";
import type { UserRoleValue } from "@/shared/domain";
import { Profile as ProfileEntity } from "../domain/entities/Profile";
import { UserRole, UniqueId } from "@/shared/domain";

export class SupabaseProfileRepository implements IProfileRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(userId: string): Promise<Profile | null> {
    const { data } = await this.db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data ? this.toDomain(data) : null;
  }

  async findByStudentId(studentId: string): Promise<Profile | null> {
    const { data } = await this.db
      .from("profiles")
      .select("*")
      .eq("student_id", studentId)
      .single();
    return data ? this.toDomain(data) : null;
  }

  async findAllByRole(role: UserRoleValue): Promise<Profile[]> {
    const { data } = await this.db
      .from("profiles")
      .select("*")
      .eq("role", role)
      .eq("active", true);
    return (data ?? []).map((r) => this.toDomain(r));
  }

  async save(profile: Profile): Promise<void> {
    await this.db.from("profiles").upsert({
      id: profile.userId,
      role: profile.role.value,
      full_name: profile.fullName,
      active: profile.active,
      student_id: profile.studentId ?? null,
    });
  }

  async markPasswordChanged(userId: string): Promise<void> {
    await this.db
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", userId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(row: any): Profile {
    const roleResult = UserRole.create(row.role as string);
    if (!roleResult.ok) throw new Error(`Role inválida no DB: ${row.role}`);
    return ProfileEntity.create(
      {
        userId: row.id as string,
        role: roleResult.value,
        fullName: row.full_name as string,
        active: row.active as boolean,
        studentId: row.student_id as string | undefined,
      },
      new UniqueId(row.id as string),
    );
  }
}
