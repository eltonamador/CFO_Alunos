import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildInternshipWorkbook } from "./builders";
import { buildInternshipPDF } from "./pdf-builders";
import type { InternshipScheduleReportRow } from "./internship-report-data";
import {
  formatReportDateTime,
  internshipSourceLabel,
  internshipStatusLabel,
} from "./internship-report-data";

const program = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Estágio Supervisionado CFO 2026.1",
  starts_on: "2026-09-26",
  ends_on: "2026-12-13",
  required_minutes: 15_000,
  target_minutes: 15_120,
};

const workload = [
  {
    student_id: "00000000-0000-0000-0000-000000000002",
    student_number: 1,
    war_name: "CADETE TESTE",
    planned_minutes: 1_440,
    performed_minutes: 720,
    validated_minutes: 600,
    required_minutes: 15_000,
    target_minutes: 15_120,
    missing_required_minutes: 14_400,
    missing_target_minutes: 14_520,
    excess_minutes: 0,
    assigned_shifts: 2,
    awaiting_homologation: 1,
    open_occurrences: 1,
    concluded: false,
  },
];

const schedule = [
  {
    shift_id: "00000000-0000-0000-0000-000000000003",
    assignment_id: "00000000-0000-0000-0000-000000000004",
    student_id: workload[0]!.student_id,
    student_number: 1,
    war_name: "CADETE TESTE",
    activity_code: "usb",
    activity_name: "USB — Atendimento Pré-Hospitalar",
    site_name: "1º GBM",
    resource_name: "Vaga adicional USB",
    template_code: "DU-USB-12",
    abm_departure_time: "18:00:00",
    obm_arrival_time: "18:30:00",
    obm_departure_time: "05:30:00",
    abm_return_time: "06:00:00",
    shift_date: "2026-09-28",
    starts_at: "2026-09-28T21:00:00+00:00",
    ends_at: "2026-09-29T09:00:00+00:00",
    planned_minutes: 720,
    shift_status: "publicado",
    assignment_status: "prevista",
    assignment_source: "manual",
    movement_reason: null,
    supervisor_name: "Oficial de teste",
    document_reference: "Ficha 001",
    validation_status: "homologado",
    performed_minutes: 720,
    approved_minutes: 600,
    cadet_report_count: 1,
  },
];

function fakeSupabase(reportSchedule: InternshipScheduleReportRow[] = schedule) {
  return {
    from(table: string) {
      const data =
        table === "courses" ? { id: "course" } : table === "classes" ? { id: "class" } : program;
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data, error: null }),
      };
      return chain;
    },
    rpc(name: string) {
      const data = name === "internship_coordination_workload" ? workload : reportSchedule;
      const chain = {
        order: () => chain,
        range: async (from: number, to: number) => ({
          data: data.slice(from, to + 1),
          error: null,
        }),
      };
      return chain;
    },
  };
}

describe("relatório do estágio", () => {
  it("gera XLSX com resumo, agenda e fórmulas de saldo", async () => {
    const buffer = await buildInternshipWorkbook(fakeSupabase() as never);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Resumo de Carga",
      "Agenda Detalhada",
    ]);
    const summary = workbook.getWorksheet("Resumo de Carga")!;
    expect(summary.getCell("E7").value).toBeInstanceOf(Date);
    expect((summary.getCell("E7").value as Date).getUTCHours()).toBe(10);
    expect(summary.getCell("H7").value).toMatchObject({ formula: "MAX(0,F7-E7)" });
    expect(summary.getCell("N7").value).toMatchObject({
      formula: 'IF(E7>=F7,"Integralizado","Em formação")',
      result: "Em formação",
    });
    const agenda = workbook.getWorksheet("Agenda Detalhada")!;
    expect(agenda.getCell("B2").value).toBe("DU-USB-12");
    expect((agenda.getCell("I2").value as Date).getUTCHours()).toBe(18);
    expect((agenda.getCell("J2").value as Date).getUTCHours()).toBe(6);
    expect(agenda.getCell("M2").value).toBeInstanceOf(Date);
    expect((agenda.getCell("M2").value as Date).getUTCHours()).toBe(10);
  });

  it("gera PDF paginado com resumo e agenda", async () => {
    const buffer = await buildInternshipPDF(fakeSupabase() as never);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    const document = await PDFDocument.load(Uint8Array.from(buffer));
    expect(document.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("traduz origem e situação operacional", () => {
    expect(internshipSourceLabel("reposicao")).toBe("Reposição");
    expect(internshipStatusLabel(schedule[0]!)).toBe("Homologada");
  });
});

describe("horários de fim de semana nos relatórios", () => {
  it.each([
    ["SAB-USB-D12", "2026-10-10T10:45:00Z", "2026-10-10T22:45:00Z", 720, 7, 19, 10],
    ["DOM-USB-N12", "2026-10-11T22:45:00Z", "2026-10-12T10:45:00Z", 720, 19, 7, 12],
    ["SAB-AR-24", "2026-10-10T10:45:00Z", "2026-10-11T10:45:00Z", 1440, 7, 7, 11],
  ] as const)(
    "%s mantém relógio local e carga sem deslocamento no Excel",
    async (code, start, end, minutes, startHour, endHour, endDay) => {
      const row = {
        ...schedule[0]!,
        template_code: code,
        starts_at: start,
        ends_at: end,
        planned_minutes: minutes,
        abm_departure_time: null,
        abm_return_time: null,
      };
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await buildInternshipWorkbook(fakeSupabase([row]) as never));
      const agenda = book.getWorksheet("Agenda Detalhada")!;
      const begins = agenda.getCell("I2").value as Date;
      const ends = agenda.getCell("J2").value as Date;
      expect([begins.getUTCHours(), begins.getUTCMinutes()]).toEqual([startHour, 45]);
      expect([ends.getUTCDate(), ends.getUTCHours(), ends.getUTCMinutes()]).toEqual([
        endDay,
        endHour,
        45,
      ]);
      expect((ends.getTime() - begins.getTime()) / 60000).toBe(minutes);
      expect(agenda.getCell("Q2").value).toBe("Apresentação OBM, sem deslocamento");
      expect(formatReportDateTime(start)).toContain(String(startHour).padStart(2, "0") + ":45");
    },
  );
});
