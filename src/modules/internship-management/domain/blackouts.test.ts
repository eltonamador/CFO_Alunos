import { expect, it } from "vitest";
import { weeklyWindowOverlaps } from "./blackouts";

// Guarda do sábado: sexta 18h a sábado 19h (horário de Belém).
const sabbath = {
  starts_on: "2026-09-26",
  ends_on: "2028-12-31",
  window_start_dow: 5,
  window_start: "18:00:00",
  window_minutes: 25 * 60,
};
const at = (day: string, time: string) => `${day}T${time}:00-03:00`;

it("bloqueia serviços que cruzam de sexta 18h a sábado 19h", () => {
  // Sexta 18h → sábado 06h, sábado diurno e permanência noturna de sábado a partir das 18h.
  expect(weeklyWindowOverlaps(sabbath, at("2026-10-02", "18:00"), at("2026-10-03", "06:00"))).toBe(
    true,
  );
  expect(weeklyWindowOverlaps(sabbath, at("2026-10-03", "07:45"), at("2026-10-03", "19:45"))).toBe(
    true,
  );
  expect(weeklyWindowOverlaps(sabbath, at("2026-10-03", "18:00"), at("2026-10-04", "06:00"))).toBe(
    true,
  );
  // Plantão de 24h iniciado na quinta invade a sexta à noite.
  expect(weeklyWindowOverlaps(sabbath, at("2026-10-01", "19:45"), at("2026-10-02", "19:45"))).toBe(
    true,
  );
});

it("libera horários fora da guarda", () => {
  // Quinta 18h → sexta 06h, sexta diurna até 18h e sábado à noite a partir das 19h45.
  expect(weeklyWindowOverlaps(sabbath, at("2026-10-01", "18:00"), at("2026-10-02", "06:00"))).toBe(
    false,
  );
  expect(weeklyWindowOverlaps(sabbath, at("2026-10-02", "06:00"), at("2026-10-02", "18:00"))).toBe(
    false,
  );
  expect(weeklyWindowOverlaps(sabbath, at("2026-10-03", "19:45"), at("2026-10-04", "07:45"))).toBe(
    false,
  );
  expect(weeklyWindowOverlaps(sabbath, at("2026-10-04", "07:45"), at("2026-10-05", "07:45"))).toBe(
    false,
  );
});

it("respeita a vigência e ignora regras sem janela", () => {
  const fridayNight = [at("2026-09-25", "18:00"), at("2026-09-26", "06:00")] as const;
  expect(weeklyWindowOverlaps(sabbath, ...fridayNight)).toBe(false);
  expect(
    weeklyWindowOverlaps({ starts_on: "2026-09-26", ends_on: "2026-12-13" }, ...fridayNight),
  ).toBe(false);
});
