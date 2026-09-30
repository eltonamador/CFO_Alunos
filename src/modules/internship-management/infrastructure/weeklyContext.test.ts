import { describe, expect, it } from "vitest";
import { loadWeeklyContext } from "./weeklyContext";

describe("contagem da semana de estágio", () => {
  it.each([false, true])("mantém horários e omite vaga já publicada: %s", async (occupied) => {
    const program = {
      id: "program",
      status: "publicado",
      timezone: "America/Belem",
      starts_on: "2026-10-01",
      ends_on: "2026-11-30",
      abm_buffer_days: 1,
    };
    const templates = [
      {
        code: "DU-USB-12",
        start_weekdays: [1],
        counting_start_time: "18:00:00",
        abm_departure_time: "18:00:00",
        journey_minutes: 720,
      },
      {
        code: "SAB-USB-D12",
        start_weekdays: [6],
        counting_start_time: "07:45:00",
        abm_departure_time: null,
        journey_minutes: 720,
      },
      {
        code: "DOM-USB-N12",
        start_weekdays: [7],
        counting_start_time: "19:45:00",
        abm_departure_time: null,
        journey_minutes: 720,
      },
      {
        code: "SAB-AR-24",
        start_weekdays: [6],
        counting_start_time: "07:45:00",
        abm_departure_time: null,
        journey_minutes: 1440,
      },
    ];
    const chain = (data: unknown) => {
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "neq", "order", "in", "gte", "lte"])
        query[method] = () => query;
      query.range = query.single = async () => ({ data, error: null });
      return query;
    };
    const db = {
      from: (table: string) =>
        chain(
          table === "internship_programs"
            ? program
            : table === "internship_shift_templates"
              ? templates
              : table === "internship_sites"
                ? [{ id: "gbm", code: "gbm_1", name: "1º GBM", site_type: "gbm" }]
                : table === "internship_shifts" && occupied
                  ? [
                      {
                        site_id: "gbm",
                        starts_at: "2026-10-10T10:45:00.000Z",
                        ends_at: "2026-10-10T22:45:00.000Z",
                        internship_activity_types: { code: "usb" },
                      },
                    ]
                  : [],
        ),
      rpc: (name: string) =>
        name === "permanence_planning_context"
          ? Promise.resolve({ data: [], error: null })
          : chain(
              name === "internship_planning_cadets"
                ? [{ id: "student", student_number: 1, war_name: "TESTE" }]
                : [],
            ),
    };
    const context = await loadWeeklyContext(db as never, {
      programId: "program",
      weekStart: "2026-10-05",
      siteIds: ["gbm"],
      templateCodes: templates.map((t) => t.code),
      lifeguard: false,
    });
    expect(context.slots.map((s) => [s.templateCode, s.startsAt, s.endsAt])).toEqual([
      ["DU-USB-12", "2026-10-05T21:00:00.000Z", "2026-10-06T09:00:00.000Z"],
      ...(occupied
        ? []
        : [["SAB-USB-D12", "2026-10-10T10:45:00.000Z", "2026-10-10T22:45:00.000Z"]]),
      ["SAB-AR-24", "2026-10-10T10:45:00.000Z", "2026-10-11T10:45:00.000Z"],
      ["DOM-USB-N12", "2026-10-11T22:45:00.000Z", "2026-10-12T10:45:00.000Z"],
    ]);
  });
});

it.each([false, true])(
  "identifica GV já registrado sem tentar recriar o plano: semana completa %s",
  async (bothDays) => {
    const program = {
      id: "p",
      status: "publicado",
      timezone: "America/Belem",
      starts_on: "2026-09-26",
      ends_on: "2026-12-13",
      abm_buffer_days: 1,
    };
    const beaches = Array.from({ length: 5 }, (_, i) => ({
      id: `b${i}`,
      name: `Praia ${i}`,
      code: `praia_${i + 1}`,
      site_type: "praia",
    }));
    const days = bothDays ? ["2026-09-26", "2026-09-27"] : ["2026-09-26"];
    const plans = days.map((day) => ({ code: `guarda_vida_${day.replaceAll("-", "")}` }));
    const history = days.flatMap((day) =>
      beaches.map((b) => ({
        shift_id: `${day}-${b.id}`,
        shift_date: day,
        activity_code: "guarda_vida",
        shift_status: "publicado",
      })),
    );
    const chain = (data: unknown) => {
      const q: Record<string, unknown> = {};
      for (const method of ["select", "eq", "neq", "order", "in", "gte", "lte"]) q[method] = () => q;
      q.range = q.single = async () => ({ data, error: null });
      return q;
    };
    const db = {
      from: (name: string) =>
        chain(
          name === "internship_programs"
            ? program
            : name === "internship_sites"
              ? beaches
              : name === "internship_operation_plans"
                ? plans
                : [],
        ),
      rpc: (name: string) =>
        name === "permanence_planning_context"
          ? Promise.resolve({ data: [], error: null })
          : chain(
              name === "internship_planning_cadets"
                ? [{ id: "s", student_number: 1, war_name: "Cadete" }]
                : name === "internship_coordination_schedule"
                  ? history
                  : [],
            ),
    };
    const result = await loadWeeklyContext(db as never, {
      programId: "p",
      weekStart: "2026-09-21",
      siteIds: [],
      templateCodes: [],
      lifeguard: true,
    });
    expect(result.recordedLifeguardDays).toEqual(
      days.map((date) => ({ date, publishedCount: 5, draftCount: 0 })),
    );
    expect(result.slots).toHaveLength(bothDays ? 0 : 5);
    expect(result.slots.every((s) => s.date === "2026-09-27")).toBe(true);
  },
);
