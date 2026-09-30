import { beforeEach, expect, it, vi } from "vitest";
import { recordInternshipHandover } from "./handoverActions";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const input = {
  assignmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  newStudentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  handoverAt: "2026-09-27T14:00:00-03:00",
  reason: "Passagem autorizada",
};
beforeEach(() => vi.clearAllMocks());
it("nega gestão a cadete comum antes de acessar o banco", async () => {
  vi.mocked(getSession).mockResolvedValue({ active: true, role: "aluno" } as Awaited<
    ReturnType<typeof getSession>
  >);
  expect(await recordInternshipHandover(input)).toHaveProperty("error");
  expect(createSupabaseServerClient).not.toHaveBeenCalled();
});
it("revalida fichas, agenda e painéis somente após a transação ter sido confirmada", async () => {
  vi.mocked(getSession).mockResolvedValue({ active: true, role: "coordenacao" } as Awaited<
    ReturnType<typeof getSession>
  >);
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({ error: { code: "23514", message: "Descanso insuficiente" } })
    .mockResolvedValueOnce({ error: null });
  vi.mocked(createSupabaseServerClient).mockReturnValue({ rpc } as unknown as ReturnType<
    typeof createSupabaseServerClient
  >);
  expect(await recordInternshipHandover(input)).toEqual({ error: "Descanso insuficiente" });
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(await recordInternshipHandover(input)).toEqual({ success: true });
  expect(revalidatePath).toHaveBeenCalledWith("/coordenacao/estagio/agenda");
  expect(revalidatePath).toHaveBeenCalledWith("/aluno/estagio");
  expect(revalidatePath).toHaveBeenCalledWith("/aluno");
});
it("envia a passagem de Ian para homologação sem alterar a escala", async () => {
  vi.mocked(getSession).mockResolvedValue({
    active: true, role: "aluno", canManageInternship: true,
  } as Awaited<ReturnType<typeof getSession>>);
  const rpc = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(createSupabaseServerClient).mockReturnValue({ rpc } as unknown as ReturnType<
    typeof createSupabaseServerClient
  >);
  expect(await recordInternshipHandover(input)).toEqual({ pending: true });
  expect(rpc).toHaveBeenCalledWith("internship_request_change", expect.objectContaining({
    p_change_type: "passagem",
    p_assignment_id: input.assignmentId,
    p_new_student_id: input.newStudentId,
  }));
  expect(rpc).not.toHaveBeenCalledWith("internship_handover_assignment", expect.anything());
});
