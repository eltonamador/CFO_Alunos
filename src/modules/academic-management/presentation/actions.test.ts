import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionProfile } from "@/modules/identity/presentation/session";
import { academicAction } from "./actions";

const mocks = vi.hoisted(() => ({ session: vi.fn(), client: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: mocks.session }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

const id = "00000000-0000-4000-8000-000000000001";
const profile: SessionProfile = {
  userId: id,
  email: "test@example.invalid",
  role: "coordenacao",
  fullName: "Coordenação teste",
  studentId: null,
  active: true,
  isFirstAccess: false,
  warName: null,
  studentNumber: null,
};
function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    operation: "save_grade",
    offering_id: id,
    assessment_id: id,
    enrollment_id: id,
    score: "0",
    expected_revision: "0",
    reason: "",
    ...overrides,
  }))
    data.set(key, value);
  return data;
}
function fakeClient(
  options: { assigned?: boolean; exists?: boolean; rpcError?: { code: string } } = {},
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: options.assigned ? [{ id }] : [], error: null }),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: options.exists === false ? null : { id }, error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data: {}, error: options.rpcError ?? null }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(profile);
});

describe("academic Server Action authorization", () => {
  it.each([null, { ...profile, active: false }, { ...profile, isFirstAccess: true }])(
    "rejects absent, inactive or first-access sessions before touching the database",
    async (session) => {
      mocks.session.mockResolvedValue(session);
      expect((await academicAction(null, form())).ok).toBe(false);
      expect(mocks.client).not.toHaveBeenCalled();
    },
  );
  it.each(["aluno", "secretaria"])("does not let %s write grades", async (role) => {
    mocks.session.mockResolvedValue({ ...profile, role });
    expect((await academicAction(null, form())).ok).toBe(false);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("requires an active instructor designation in addition to RLS", async () => {
    mocks.session.mockResolvedValue({ ...profile, role: "instrutor" });
    const client = fakeClient();
    mocks.client.mockReturnValue(client);
    expect((await academicAction(null, form())).ok).toBe(false);
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("does not let an instructor change frequency", async () => {
    mocks.session.mockResolvedValue({ ...profile, role: "instrutor" });
    const result = await academicAction(
      null,
      form({
        operation: "save_attendance",
        justified_absences: "0",
        unjustified_absences: "0",
        expected_revision: "1",
        reason: "Conferência",
      }),
    );
    expect(result.ok).toBe(false);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("checks assessment and enrollment membership before the transactional RPC", async () => {
    const client = fakeClient({ exists: false });
    mocks.client.mockReturnValue(client);
    expect((await academicAction(null, form())).ok).toBe(false);
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("preserves zero, null and expected revision in the grade RPC", async () => {
    const client = fakeClient();
    mocks.client.mockReturnValue(client);
    expect((await academicAction(null, form())).ok).toBe(true);
    expect(client.rpc).toHaveBeenCalledWith(
      "academic_save_grade",
      expect.objectContaining({ p_score: 0, p_expected_revision: 0 }),
    );
    expect(
      (
        await academicAction(
          null,
          form({ score: "", expected_revision: "1", reason: "Correção do lançamento" }),
        )
      ).ok,
    ).toBe(true);
    expect(client.rpc).toHaveBeenLastCalledWith(
      "academic_save_grade",
      expect.objectContaining({
        p_score: null,
        p_expected_revision: 1,
        p_reason: "Correção do lançamento",
      }),
    );
  });
  it("requires a reason for every correction", async () => {
    const client = fakeClient();
    mocks.client.mockReturnValue(client);
    expect((await academicAction(null, form({ expected_revision: "1" }))).ok).toBe(false);
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("reports a lost update and never reports success or revalidates", async () => {
    const client = fakeClient({ rpcError: { code: "40001" } });
    mocks.client.mockReturnValue(client);
    const result = await academicAction(null, form());
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("outra pessoa") });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("creates a new offering through the transactional RI policy RPC", async () => {
    const client = fakeClient();
    mocks.client.mockReturnValue(client);
    const result = await academicAction(
      null,
      form({
        operation: "create_offering",
        class_id: id,
        discipline_id: id,
        academic_year: "2026",
        workload_hours: "40",
        vc_count: "2",
        decision_ref: "Aplicação provisória conforme RI ABM 2023",
      }),
    );
    expect(result.ok).toBe(true);
    expect(client.rpc).toHaveBeenCalledWith("academic_create_offering_ri", {
      p_class_id: id,
      p_discipline_id: id,
      p_academic_year: 2026,
      p_workload_hours: 40,
      p_vc_count: 2,
      p_decision_ref: "Aplicação provisória conforme RI ABM 2023",
    });
  });
});
