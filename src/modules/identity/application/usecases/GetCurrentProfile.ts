import type { UseCase } from "@/shared/application/UseCase";
import type { Result } from "@/shared/domain";
import { err } from "@/shared/domain";
import type { IProfileRepository } from "../../domain/ports/IProfileRepository";
import type { Profile } from "../../domain/entities/Profile";

type Input = { userId: string };
type Output = Profile;

export class GetCurrentProfile implements UseCase<Input, Output> {
  constructor(private readonly repo: IProfileRepository) {}

  async execute({ userId }: Input): Promise<Result<Output>> {
    const profile = await this.repo.findById(userId);
    if (!profile) return err("Perfil não encontrado");
    return { ok: true, value: profile };
  }
}
