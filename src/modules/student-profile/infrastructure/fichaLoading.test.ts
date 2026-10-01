import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  students: {
    fetchStudent: vi.fn(),
    fetchStudentContact: vi.fn(),
    fetchStudentAddress: vi.fn(),
    fetchEmergencyContacts: vi.fn(),
    fetchHealthRestriction: vi.fn(),
    signedPhotoUrl: vi.fn(),
    fetchStudentCanga: vi.fn(),
    fetchStudentLogistics: vi.fn(),
    fetchStudentVehicle: vi.fn(),
    listStudents: vi.fn(),
    fetchStudentAuditLogs: vi.fn(),
    fetchStudentWeightHistory: vi.fn(),
  },
  checklist: vi.fn(),
  followUps: vi.fn(),
}));
vi.mock("@/components/app/RoleGuard", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => ({}) }));
vi.mock("@/lib/supabase/queries/students", () => mocks.students);
vi.mock("@/lib/supabase/queries/equipment", () => ({ fetchEquipmentChecklist: mocks.checklist }));
vi.mock("@/modules/cadet-followup/infrastructure/queries", () => ({
  listFollowUps: mocks.followUps,
}));

import StudentPage from "@/app/(app)/aluno/ficha/page";
import CoordinationPage from "@/app/(app)/coordenacao/alunos/[id]/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ studentId: "student-1", role: "aluno", fullName: "Teste" });
  for (const fn of Object.values(mocks.students)) fn.mockResolvedValue(null);
  mocks.students.fetchStudent.mockResolvedValue({
    id: "student-1",
    war_name: "TESTE",
    student_number: 1,
    course_status: "matriculado",
  });
  mocks.students.listStudents.mockResolvedValue([]);
});

describe("consultas da ficha por aba", () => {
  it("abrir contato não consulta saúde, materiais ou histórico", async () => {
    await StudentPage({ searchParams: { tab: "contato" } });
    expect(mocks.requireRole).toHaveBeenCalledWith("aluno");
    expect(mocks.students.fetchStudentContact).toHaveBeenCalledOnce();
    expect(mocks.students.fetchHealthRestriction).not.toHaveBeenCalled();
    expect(mocks.students.fetchStudentWeightHistory).not.toHaveBeenCalled();
    expect(mocks.checklist).not.toHaveBeenCalled();
    expect(mocks.students.fetchStudentAuditLogs).not.toHaveBeenCalled();
  });
  it("abrir saúde continua carregando restrições e histórico de peso", async () => {
    await StudentPage({ searchParams: { tab: "saude" } });
    expect(mocks.students.fetchHealthRestriction).toHaveBeenCalledOnce();
    expect(mocks.students.fetchStudentWeightHistory).toHaveBeenCalledOnce();
    expect(mocks.students.fetchStudentContact).not.toHaveBeenCalled();
  });
  it("coordenação mantém o indicador de restrição sem carregar todas as abas", async () => {
    await CoordinationPage({ params: { id: "student-1" }, searchParams: { tab: "contato" } });
    expect(mocks.requireRole).toHaveBeenCalledWith("coordenacao");
    expect(mocks.students.fetchHealthRestriction).toHaveBeenCalledOnce();
    expect(mocks.students.fetchStudentContact).toHaveBeenCalledOnce();
    expect(mocks.students.fetchStudentAuditLogs).not.toHaveBeenCalled();
    expect(mocks.students.listStudents).not.toHaveBeenCalled();
    expect(mocks.checklist).not.toHaveBeenCalled();
    expect(mocks.followUps).not.toHaveBeenCalled();
  });
});
