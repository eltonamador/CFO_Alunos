import type { UseCase } from "@/shared/application/UseCase";
import type { Result } from "@/shared/domain";
import { ok, err } from "@/shared/domain";
import type { IDocumentRepository } from "../../domain/ports/IDocumentRepository";

type Input =
  | { action: "validate"; documentId: string; validatedBy: string }
  | { action: "reject"; documentId: string; validatedBy: string; reason: string };

export class ValidateDocument implements UseCase<Input, void> {
  constructor(private readonly repo: IDocumentRepository) {}

  async execute(input: Input): Promise<Result<void>> {
    const doc = await this.repo.findById(input.documentId);
    if (!doc) return err("Documento não encontrado");

    if (input.action === "validate") {
      doc.validate(input.validatedBy);
    } else {
      if (!input.reason?.trim()) return err("Motivo da recusa é obrigatório");
      doc.reject(input.validatedBy, input.reason);
    }

    await this.repo.save(doc);
    return ok(undefined);
  }
}
