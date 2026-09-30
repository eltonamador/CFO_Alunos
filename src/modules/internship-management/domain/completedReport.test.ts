import { describe, expect, it } from "vitest";
import type { InternshipScheduleReportRow } from "@/lib/reports/internship-report-data";
import { completedAssignments } from "./completedReport";

const row = (assignmentId: string, endsAt: string): InternshipScheduleReportRow => ({
  shift_id: assignmentId,
  assignment_id: assignmentId,
  student_id: "cadet",
  student_number: 1,
  war_name: "CADETE",
  activity_code: "AR",
  activity_name: "Auto Resgate",
  site_name: "GBM",
  resource_name: "AR",
  template_code: null,
  abm_departure_time: null,
  obm_arrival_time: null,
  obm_departure_time: null,
  abm_return_time: null,
  shift_date: "2026-09-29",
  starts_at: "2026-09-29T10:00:00Z",
  ends_at: endsAt,
  planned_minutes: 720,
  shift_status: "publicado",
  assignment_status: "prevista",
  assignment_source: "manual",
  movement_reason: null,
  supervisor_name: null,
  document_reference: null,
  validation_status: null,
  performed_minutes: null,
  approved_minutes: null,
  cadet_report_count: 0,
});

describe("completedAssignments", () => {
  it("inclui somente plantões encerrados e usa a avaliação mais recente", () => {
    const result = completedAssignments(
      [row("done", "2026-09-29T11:00:00Z"), row("future", "2026-09-30T11:00:00Z")],
      [
        { assignment_id: "done", version: 1, status: "aguardando", source: "digital", expires_at: null },
        { assignment_id: "done", version: 2, status: "respondida", source: "digital", expires_at: null },
      ],
      [{ assignment_id: "done", point_type: "entrada" }],
      Date.parse("2026-09-29T12:00:00Z"),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ evaluationKey: "recebida", pointLabel: "Só entrada", homologated: false });
  });

  it("distingue convite pendente, ausência de convite e horas homologadas", () => {
    const validated = { ...row("validated", "2026-09-29T11:00:00Z"), validation_status: "homologado" };
    const result = completedAssignments(
      [validated, row("missing", "2026-09-29T11:00:00Z")],
      [{ assignment_id: "validated", version: 1, status: "aguardando", source: "digital", expires_at: null }],
      [],
      Date.parse("2026-09-29T12:00:00Z"),
    );
    expect(result.map((item) => [item.evaluationKey, item.homologated])).toEqual([
      ["aguardando", true],
      ["sem_convite", false],
    ]);
  });
});
