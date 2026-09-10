import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_POLICY_PARAMETERS } from "../domain/academic";
import { getAcademicDashboard, getAcademicDetail } from "./queries";

const mocks = vi.hoisted(() => ({ session: vi.fn(), client: vi.fn() }));
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: mocks.session }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const offeringId = "00000000-0000-4000-8000-000000000001";
const data: Record<string, Record<string, unknown>[]> = {};
let failingTable: string | null;

function client() {
  return {
    from: vi.fn((table: string) => {
      const filters: [string, unknown][] = [];
      let start = 0;
      let end = Number.MAX_SAFE_INTEGER;
      const query = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: (field: string, value: unknown) => {
          filters.push([field, value]);
          return query;
        },
        filter: (field: string, _operator: string, value: unknown) => {
          filters.push([field, value]);
          return query;
        },
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        range: (first: number, last: number) => {
          start = first;
          end = last;
          return query;
        },
        then: <T>(
          resolve: (response: {
            data: Record<string, unknown>[] | null;
            error: { code: string } | null;
          }) => T,
        ) =>
          Promise.resolve(
            resolve({
              data:
                failingTable === table
                  ? null
                  : (data[table] ?? [])
                      .filter((item) => filters.every(([field, value]) => item[field] === value))
                      .slice(start, end + 1),
              error: failingTable === table ? { code: "42P01" } : null,
            }),
          ),
      };
      return query;
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  failingTable = null;
  for (const key of Object.keys(data)) delete data[key];
  mocks.session.mockResolvedValue({
    active: true,
    isFirstAccess: false,
    role: "aluno",
    studentId: "student",
  });
  data.academic_disciplines = [
    {
      id: "discipline",
      code: "TEST",
      name: "Disciplina teste",
      phase: 1,
      kind: "disciplina",
      workload_hours: 30,
      source_ref: "Teste",
      conflicts: [],
      active: true,
    },
  ];
  data.academic_offerings = [
    {
      id: offeringId,
      class_id: "class",
      discipline_id: "discipline",
      academic_year: 2026,
      workload_hours: 30,
      vc_count: 1,
      policy_id: "policy",
      decision_ref: "Ata teste",
      active: true,
      created_at: "2026-09-10",
    },
  ];
  data.academic_policies = [
    {
      id: "policy",
      name: "Teste",
      parameters: DEFAULT_POLICY_PARAMETERS,
      decision_ref: "Ata teste",
      approved_by: "coord",
      approved_at: "2026-09-10",
    },
  ];
  data.classes = [{ id: "class", course_id: "course", name: "Turma teste" }];
  data.academic_assessments = [
    {
      id: "assessment",
      offering_id: offeringId,
      kind: "VC",
      sequence: 1,
      title: "VC 1",
      held_on: null,
    },
  ];
  mocks.client.mockReturnValue(client());
});

describe("academic query completeness and privacy", () => {
  it("paginates enrollment/grade rows beyond the PostgREST page cap", async () => {
    data.academic_enrollments = Array.from({ length: 501 }, (_, index) => ({
      id: `enrollment-${index}`,
      student_id: `student-${index}`,
      student_label: "TESTE",
      offering_id: offeringId,
      justified_absences: 0,
      unjustified_absences: 0,
      revision: 1,
      change_reason: null,
    }));
    data.academic_grades = Array.from({ length: 501 }, (_, index) => ({
      id: `grade-${index}`,
      enrollment_id: `enrollment-${index}`,
      offering_id: offeringId,
      assessment_id: "assessment",
      score: 7,
      revision: 1,
      change_reason: null,
      updated_at: "2026-09-10",
    }));
    const result = await getAcademicDashboard();
    expect(result.enrollments).toHaveLength(501);
    expect(result.enrollments[500]?.result.status).toBe("approved");
    const instance = mocks.client.mock.results[0]!.value as ReturnType<typeof client>;
    expect(
      instance.from.mock.calls.some(([table]) => table === "profiles" || table === "students"),
    ).toBe(false);
  });
  it("does not disguise an absent migration as an empty list", async () => {
    failingTable = "academic_enrollments";
    await expect(getAcademicDashboard()).rejects.toThrow("aguardando instalação");
  });
  it("loads the full offering audit and lets the UI paginate it", async () => {
    mocks.session.mockResolvedValue({ active: true, isFirstAccess: false, role: "coordenacao" });
    data.academic_audit_events = Array.from({ length: 502 }, (_, index) => ({
      id: `audit-${index}`,
      offering_id: offeringId,
      created_at: "2026-09-10",
    }));
    const result = await getAcademicDetail(offeringId);
    expect(result?.audit).toHaveLength(502);
  });
  it("rejects inactive sessions without constructing the database client", async () => {
    mocks.session.mockResolvedValue({ active: false, role: "coordenacao" });
    await expect(getAcademicDashboard()).rejects.toThrow("Sessão inválida");
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
