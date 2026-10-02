import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordInternshipPoint } from "./pointActions";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@/modules/identity/presentation/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const input = {
  assignmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  pointType: "entrada" as const,
  latitude: 0.03,
  longitude: -51.07,
  accuracy: 15,
  supervisorName: "Tenente Silva",
};
const point = {
  id: "saved-point",
  point_type: "entrada",
  recorded_at: "2026-10-02T20:00:00Z",
  latitude: 0.02,
  longitude: -51.08,
  accuracy_m: 10,
  distance_m: 1500,
  site_radius_m: 200,
  location_status: "fora",
  supervisor_name: "Tenente Silva",
};
const rpc = vi.fn();
const from = vi.fn();
const select = vi.fn();
const eq = vi.fn();
const maybeSingle = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSession).mockResolvedValue({
    active: true,
    role: "aluno",
    studentId: "student",
  } as Awaited<ReturnType<typeof getSession>>);
  rpc.mockResolvedValue({ data: point.id, error: null });
  const query = { select, eq, maybeSingle };
  from.mockReturnValue(query);
  select.mockReturnValue(query);
  eq.mockReturnValue(query);
  maybeSingle.mockResolvedValue({ data: point, error: null });
  vi.mocked(createSupabaseServerClient).mockReturnValue({ rpc, from } as unknown as ReturnType<
    typeof createSupabaseServerClient
  >);
});

describe("registro e conferência do ponto", () => {
  it("retorna o ponto salvo pelo servidor, inclusive em repetição, sem recalcular pelo novo GPS", async () => {
    expect(await recordInternshipPoint(input)).toEqual({ success: true, point });
    expect(rpc).toHaveBeenCalledWith("internship_record_point", {
      p_assignment_id: input.assignmentId,
      p_point_type: "entrada",
      p_latitude: 0.03,
      p_longitude: -51.07,
      p_accuracy_m: 15,
      p_supervisor_name: "Tenente Silva",
    });
    expect(from).toHaveBeenCalledWith("internship_attendance_points");
    expect(eq).toHaveBeenCalledWith("id", point.id);
    expect(eq).toHaveBeenCalledWith("student_id", "student");
    expect(eq).toHaveBeenCalledWith("assignment_id", input.assignmentId);
    expect(revalidatePath).toHaveBeenCalledWith("/aluno/estagio");
  });
  it("retorna também a conferência da saída antecipada para instrução", async () => {
    await recordInternshipPoint({
      ...input,
      pointType: "saida",
      earlyExitReason: "Instrução na ABM por orientação da Coordenação",
    });
    expect(rpc).toHaveBeenCalledWith(
      "internship_record_point_with_reason",
      expect.objectContaining({
        p_point_type: "saida",
        p_early_exit_reason: "Instrução na ABM por orientação da Coordenação",
      }),
    );
    expect(maybeSingle).toHaveBeenCalledOnce();
  });
  it.each(["error", "missing", "throw"])(
    "preserva o sucesso após gravação quando a leitura falha (%s)",
    async (failure) => {
      if (failure === "throw") maybeSingle.mockRejectedValue(new Error("Conexão interrompida"));
      else
        maybeSingle.mockResolvedValue({
          data: null,
          error: failure === "error" ? { message: "Indisponível" } : null,
        });
      expect(await recordInternshipPoint(input)).toEqual({ success: true, point: null });
      expect(rpc).toHaveBeenCalledOnce();
    },
  );
  it("não consulta resultado nem revalida telas quando a gravação falha", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "23514", message: "A participação não está ativa." },
    });
    expect(await recordInternshipPoint(input)).toEqual({ error: "A participação não está ativa." });
    expect(from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { active: false, role: "aluno", studentId: "student" },
    { active: true, role: "coordenacao" },
    { active: true, role: "aluno" },
  ])("exige sessão ativa de cadete vinculado (%j)", async (session) => {
    vi.mocked(getSession).mockResolvedValue(session as Awaited<ReturnType<typeof getSession>>);
    expect(await recordInternshipPoint(input)).toEqual({ error: "Acesso restrito ao cadete." });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
  it.each([{ latitude: 91 }, { longitude: -181 }, { accuracy: -1 }, { accuracy: NaN }])(
    "recusa coordenadas ou precisão inválidas (%j)",
    async (invalid) => {
      expect(await recordInternshipPoint({ ...input, ...invalid })).toHaveProperty("error");
      expect(rpc).not.toHaveBeenCalled();
    },
  );
});
