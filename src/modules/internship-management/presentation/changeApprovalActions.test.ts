import { beforeEach, expect, it, vi } from "vitest";
import { decideInternshipChangeAction } from "./changeApprovalActions";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/modules/identity/presentation/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));

const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function decision(value: string, note = "") {
  const form = new FormData();
  form.set("requestId", requestId);
  form.set("decision", value);
  form.set("note", note);
  return form;
}
beforeEach(() => vi.clearAllMocks());

it("impede que a administração delegada homologue uma troca", async () => {
  vi.mocked(getSession).mockResolvedValue({ active: true, role: "aluno", canManageInternship: true } as Awaited<ReturnType<typeof getSession>>);
  await expect(decideInternshipChangeAction(decision("homologar"))).rejects.toThrow("Somente a Coordenação");
  expect(createSupabaseServerClient).not.toHaveBeenCalled();
});

it("exige motivo ao recusar e envia homologação somente com perfil de Coordenação", async () => {
  vi.mocked(getSession).mockResolvedValue({ active: true, role: "coordenacao" } as Awaited<ReturnType<typeof getSession>>);
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: { change_type: "substituicao" } });
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));
  vi.mocked(createSupabaseServerClient).mockReturnValue({ rpc, from } as unknown as ReturnType<typeof createSupabaseServerClient>);
  await expect(decideInternshipChangeAction(decision("recusar", "não"))).rejects.toThrow("decisao_invalida");
  expect(rpc).not.toHaveBeenCalled();
  await expect(decideInternshipChangeAction(decision("homologar"))).rejects.toThrow("troca_homologada");
  expect(rpc).toHaveBeenCalledWith("internship_decide_change", {
    p_request_id: requestId,
    p_approve: true,
    p_note: null,
  });
});

it("leva a permuta homologada para a etapa dos PDFs afetados", async () => {
  vi.mocked(getSession).mockResolvedValue({ active: true, role: "coordenacao" } as Awaited<ReturnType<typeof getSession>>);
  const maybeSingle = vi.fn().mockResolvedValue({ data: { change_type: "permuta" } });
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));
  const rpc = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(createSupabaseServerClient).mockReturnValue({ rpc, from } as unknown as ReturnType<typeof createSupabaseServerClient>);
  await expect(decideInternshipChangeAction(decision("homologar"))).rejects.toThrow(
    `/coordenacao/estagio/permuta/${requestId}`,
  );
});
