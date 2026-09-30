// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), rpc: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { saveInstruction } from "./instructionActions";
const input = {
  programId: "11111111-1111-4111-8111-111111111111",
  title: "APH",
  startsAt: "2026-09-26T08:00:00-03:00",
  endsAt: "2026-09-26T12:40:00-03:00",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ role: "coordenacao", active: true });
  mocks.rpc.mockResolvedValue({ error: null });
});
describe("cadastro de instruções", () => {
  it("recusa cadete comum antes de acessar o banco", async () => {
    mocks.getSession.mockResolvedValue({ role: "aluno", active: true });
    expect((await saveInstruction(input)).error).toMatch(/Acesso restrito/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("recusa período invertido e não modifica dados", async () => {
    expect(
      (await saveInstruction({ ...input, endsAt: "2026-09-26T07:00:00-03:00" })).error,
    ).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("salva no fuso informado e atualiza a consulta de conflitos", async () => {
    expect(await saveInstruction(input)).toEqual({});
    expect(mocks.rpc).toHaveBeenCalledWith(
      "internship_save_instruction",
      expect.objectContaining({
        p_starts_at: input.startsAt,
        p_ends_at: input.endsAt,
        p_active: true,
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/coordenacao/estagio");
  });
  it("não mascara edição concorrente como sucesso", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "40001" } });
    expect((await saveInstruction(input)).error).toMatch(/Atualize/);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
