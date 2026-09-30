import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionProfile } from "@/modules/identity/presentation/session";
import { linkCoordinationMemberProfileAction } from "./coordinationTeamActions";

const mocks = vi.hoisted(() => ({ session: vi.fn(), client: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: mocks.session }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

const id = "00000000-0000-4000-8000-000000000001";
const profile: SessionProfile = {
  userId: id,
  email: "coord@example.invalid",
  role: "coordenacao",
  fullName: "Coordenação teste",
  studentId: null,
  active: true,
  isFirstAccess: false,
  warName: null,
  studentNumber: null,
};

function form(profileId = id) {
  const data = new FormData();
  data.set("memberId", id);
  data.set("profileId", profileId);
  return data;
}

function fakeClient({ activeProfile = true, updated = true, registration = "1175742" } = {}) {
  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: activeProfile ? { id } : null, error: null }),
  };
  const memberLookup = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { registration }, error: null }),
  };
  const memberChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: updated ? { id } : null, error: null }),
  };
  let memberCalls = 0;
  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") return profileChain;
      memberCalls += 1;
      return memberCalls === 1 ? memberLookup : memberChain;
    }),
    profileChain,
    memberChain,
    memberLookup,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(profile);
});

describe("vínculo de conta individual da Coordenação", () => {
  it.each([
    null,
    { ...profile, active: false },
    { ...profile, isFirstAccess: true },
    { ...profile, role: "secretaria" },
  ])("bloqueia sessões sem autoridade antes de consultar o banco", async (session) => {
    mocks.session.mockResolvedValue(session);
    expect((await linkCoordinationMemberProfileAction(null, form())).ok).toBe(false);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("aceita apenas uma conta ativa da Coordenação", async () => {
    const client = fakeClient({ activeProfile: false });
    mocks.client.mockReturnValue(client);
    const result = await linkCoordinationMemberProfileAction(null, form());
    expect(result.ok).toBe(false);
    expect(client.memberChain.update).not.toHaveBeenCalled();
  });

  it.each(["1160680", "1113666"])(
    "recusa vínculo de login para a matrícula %s",
    async (registration) => {
      const client = fakeClient({ registration });
      mocks.client.mockReturnValue(client);
      const result = await linkCoordinationMemberProfileAction(null, form());
      expect(result.ok).toBe(false);
      expect(client.profileChain.select).not.toHaveBeenCalled();
      expect(client.memberChain.update).not.toHaveBeenCalled();
    },
  );

  it("vincula a conta e revalida as consultas dependentes", async () => {
    const client = fakeClient();
    mocks.client.mockReturnValue(client);
    const result = await linkCoordinationMemberProfileAction(null, form());
    expect(result.ok).toBe(true);
    expect(client.memberChain.update).toHaveBeenCalledWith({ profile_id: id });
    expect(mocks.revalidate).toHaveBeenCalledWith("/coordenacao/equipe");
    expect(mocks.revalidate).toHaveBeenCalledWith("/coordenacao");
    expect(mocks.revalidate).toHaveBeenCalledWith("/escalas/calendario");
  });
});
