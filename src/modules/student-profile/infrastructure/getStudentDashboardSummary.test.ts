import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, rpc } = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: createClient }));

import { getStudentDashboardSummary } from "./getStudentDashboardSummary";

describe("getStudentDashboardSummary", () => {
  beforeEach(() => {
    createClient.mockReturnValue({ rpc });
    rpc.mockReset();
  });

  it("mapeia o resultado da única RPC para o formato da tela", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          profile_completion_percent: 56,
          documents_completion_percent: 40,
          quarantine_equipment_completion_percent: 20,
          equipment_completion_percent: 30,
          missing_document_types: ["cnh", "foto_3x4"],
          pending_quarantine_equipment: 3,
        },
      ],
      error: null,
    });

    await expect(getStudentDashboardSummary()).resolves.toEqual({
      profileCompletionPercent: 56,
      documentsCompletionPercent: 40,
      quarantineEquipmentCompletionPercent: 20,
      equipmentCompletionPercent: 30,
      missingDocumentTypes: ["cnh", "foto_3x4"],
      pendingQuarantineEquipment: 3,
    });
    expect(rpc).toHaveBeenCalledWith("student_dashboard_summary");
  });

  it("mantém a página funcional quando a RPC ainda não foi aplicada", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } });

    await expect(getStudentDashboardSummary()).resolves.toBeNull();
  });
});
