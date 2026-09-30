// @vitest-environment node
import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), refresh: vi.fn() }));
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: mocks.session }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
import { adjustLifeguardHours } from "./lifeguardHoursActions";
const input = {
  programId: "11111111-1111-4111-8111-111111111111",
  date: "2026-10-11",
  startsAt: "2026-10-11T14:00:00-03:00",
  endsAt: "2026-10-11T18:00:00-03:00",
  expectedStart: "2026-10-11T10:00:00-03:00",
  expectedEnd: "2026-10-11T18:00:00-03:00",
  assignmentIds: [1, 2, 3, 4, 5].map((n) => `11111111-1111-4111-8111-11111111111${n}`),
  reason: "Após instrução",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ active: true, role: "coordenacao" });
  mocks.rpc.mockResolvedValue({ data: 5, error: null });
});
it("recusa cadete comum sem chamar o banco", async () => {
  mocks.session.mockResolvedValue({ active: true, role: "aluno" });
  expect((await adjustLifeguardHours(input)).error).toBeTruthy();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("recusa virada de dia e duração excessiva", async () => {
  expect(
    (await adjustLifeguardHours({ ...input, endsAt: "2026-10-12T02:00:00-03:00" })).error,
  ).toBeTruthy();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("informa conflito de descanso sem sucesso falso", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "23514", message: "Descanso mínimo de 24h" } });
  expect((await adjustLifeguardHours(input)).error).toContain("24h");
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it("atualiza agenda e tela inicial após transação bem-sucedida", async () => {
  expect(await adjustLifeguardHours(input)).toEqual({ count: 5 });
  expect(mocks.refresh).toHaveBeenCalledWith("/aluno");
  expect(mocks.rpc).toHaveBeenCalledWith(
    "internship_reschedule_lifeguard_day",
    expect.objectContaining({
      p_expected_assignments: input.assignmentIds,
      p_expected_start: input.expectedStart,
    }),
  );
});
