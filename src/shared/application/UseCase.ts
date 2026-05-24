import type { Result } from "@/shared/domain/Result";

export interface UseCase<TInput, TOutput, TError = string> {
  execute(input: TInput): Promise<Result<TOutput, TError>>;
}
