/**
 * Cálculo central do progresso da ficha do aluno.
 *
 * Considera apenas campos obrigatórios espalhados pelas tabelas:
 *   students, student_contacts, student_addresses,
 *   emergency_contacts (prioridade 1), health_restrictions,
 *   student_logistics, vehicles.
 *
 * Regras:
 *   - Strings: precisam ser não-vazias após trim.
 *   - Números: precisam ser finitos.
 *   - Booleanos obrigatórios: `false` é resposta válida; apenas null/undefined
 *     contam como "não preenchido".
 *   - Status:
 *       filled === 0                 → "nao_iniciada"
 *       0 < filled < 0.8 * total     → "em_preenchimento"
 *       0.8 * total <= filled < total → "quase_completa"
 *       filled === total             → "completa"
 */

import type {
  StudentDetailRow,
  StudentListRow,
  StudentContactRow,
  StudentAddressRow,
  EmergencyContactRow,
  HealthRestrictionRow,
  StudentLogisticsRow,
  StudentVehicleRow,
} from "@/lib/supabase/queries/students";

export type ProgressStatus =
  | "nao_iniciada"
  | "em_preenchimento"
  | "quase_completa"
  | "completa";

export interface StudentProfileBundle {
  student: StudentDetailRow | (StudentListRow & Partial<StudentDetailRow>);
  contact: StudentContactRow | null;
  address: StudentAddressRow | null;
  emergency: EmergencyContactRow[] | null;
  health: HealthRestrictionRow | null;
  logistics: StudentLogisticsRow | null;
  vehicle: StudentVehicleRow | null;
}

export interface ProgressResult {
  filled: number;
  total: number;
  percent: number;
  status: ProgressStatus;
  missing: string[];
}

type FieldKind = "text" | "boolean" | "number";

interface RequiredField {
  id: string;
  kind: FieldKind;
  get: (b: StudentProfileBundle) => unknown;
}

const priorityOne = (b: StudentProfileBundle) =>
  (b.emergency ?? []).find((c) => c.priority === 1) ?? null;

export const REQUIRED_FIELDS: ReadonlyArray<RequiredField> = [
  // ── Identificação (students) ──────────────────────────────────────
  { id: "full_name", kind: "text", get: (b) => b.student.full_name },
  { id: "war_name", kind: "text", get: (b) => b.student.war_name },
  { id: "student_number", kind: "number", get: (b) => b.student.student_number },
  { id: "pelotao", kind: "text", get: (b) => b.student.pelotao },
  { id: "sex", kind: "text", get: (b) => b.student.sex },
  { id: "birth_date", kind: "text", get: (b) => b.student.birth_date },
  { id: "nationality", kind: "text", get: (b) => b.student.nationality },
  { id: "naturality_state", kind: "text", get: (b) => b.student.naturality_state },
  { id: "naturality_city", kind: "text", get: (b) => b.student.naturality_city },
  { id: "marital_status", kind: "text", get: (b) => b.student.marital_status },
  { id: "education_level", kind: "text", get: (b) => b.student.education_level },
  { id: "graduation_type", kind: "text", get: (b) => b.student.graduation_type },
  { id: "enrollment_id", kind: "text", get: (b) => b.student.enrollment_id },
  { id: "cpf", kind: "text", get: (b) => b.student.cpf },
  { id: "rg", kind: "text", get: (b) => b.student.rg },
  { id: "father_name", kind: "text", get: (b) => b.student.father_name },
  { id: "mother_name", kind: "text", get: (b) => b.student.mother_name },
  { id: "religion", kind: "text", get: (b) => b.student.religion },
  {
    id: "has_religious_restriction",
    kind: "boolean",
    get: (b) => b.student.has_religious_restriction,
  },

  // ── Contato (student_contacts) ────────────────────────────────────
  { id: "whatsapp", kind: "text", get: (b) => b.contact?.whatsapp ?? null },
  { id: "email_personal", kind: "text", get: (b) => b.contact?.email_personal ?? null },

  // ── Endereço (student_addresses) ──────────────────────────────────
  { id: "street", kind: "text", get: (b) => b.address?.street ?? null },
  { id: "district", kind: "text", get: (b) => b.address?.district ?? null },
  { id: "city", kind: "text", get: (b) => b.address?.city ?? null },
  { id: "state", kind: "text", get: (b) => b.address?.state ?? null },
  { id: "zip", kind: "text", get: (b) => b.address?.zip ?? null },
  {
    id: "origin_in_amapa",
    kind: "boolean",
    get: (b) => b.address?.origin_in_amapa ?? null,
  },

  // ── Emergência (emergency_contacts prioridade 1) ──────────────────
  {
    id: "emergency_name",
    kind: "text",
    get: (b) => priorityOne(b)?.full_name ?? null,
  },
  {
    id: "emergency_phone",
    kind: "text",
    get: (b) => priorityOne(b)?.phone ?? null,
  },

  // ── Saúde (health_restrictions) ───────────────────────────────────
  { id: "blood_type", kind: "text", get: (b) => b.health?.blood_type ?? null },
  { id: "rh_factor", kind: "text", get: (b) => b.health?.rh_factor ?? null },
  { id: "altura_cm", kind: "number", get: (b) => b.health?.altura_cm ?? null },
  { id: "peso_kg", kind: "number", get: (b) => b.health?.peso_kg ?? null },
  { id: "uses_glasses", kind: "boolean", get: (b) => b.health?.uses_glasses ?? null },

  // ── Logística (student_logistics) ─────────────────────────────────
  {
    id: "has_fixed_residence_macapa",
    kind: "boolean",
    get: (b) => b.logistics?.has_fixed_residence_macapa ?? null,
  },
  {
    id: "needs_housing",
    kind: "boolean",
    get: (b) => b.logistics?.needs_housing ?? null,
  },

  // ── Veículo / CNH (vehicles) ──────────────────────────────────────
  { id: "has_vehicle", kind: "boolean", get: (b) => b.vehicle?.has_vehicle ?? null },
];

function isFilled(value: unknown, kind: FieldKind): boolean {
  if (value === null || value === undefined) return false;
  if (kind === "boolean") return value === true || value === false;
  if (kind === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return Boolean(value);
}

export function statusFor(filled: number, total: number): ProgressStatus {
  if (total <= 0) return "nao_iniciada";
  if (filled <= 0) return "nao_iniciada";
  if (filled >= total) return "completa";
  const percent = (filled / total) * 100;
  if (percent >= 80) return "quase_completa";
  return "em_preenchimento";
}

export function calculateStudentProfileProgress(
  bundle: StudentProfileBundle,
): ProgressResult {
  const total = REQUIRED_FIELDS.length;
  const missing: string[] = [];
  let filled = 0;

  for (const field of REQUIRED_FIELDS) {
    if (isFilled(field.get(bundle), field.kind)) {
      filled += 1;
    } else {
      missing.push(field.id);
    }
  }

  const rawPercent = total > 0 ? (filled / total) * 100 : 0;
  // Trava 100% só quando todos os campos estão preenchidos para não exibir
  // "100%" arredondado com algum campo ainda em aberto.
  const percent =
    filled === total ? 100 : Math.min(99, Math.round(rawPercent));

  return {
    filled,
    total,
    percent,
    status: statusFor(filled, total),
    missing,
  };
}

// ── Metadados para UI ───────────────────────────────────────────────
export const STATUS_META: Record<
  ProgressStatus,
  {
    label: string;
    badgeVariant: "default" | "warning" | "info" | "success" | "gold";
    barClass: string;
    trackClass: string;
    textClass: string;
  }
> = {
  nao_iniciada: {
    label: "Não iniciada",
    badgeVariant: "default",
    barClass: "bg-ink-400 dark:bg-ink-500",
    trackClass: "bg-ink-100 dark:bg-ink-800",
    textClass: "text-ink-600 dark:text-ink-300",
  },
  em_preenchimento: {
    label: "Em preenchimento",
    badgeVariant: "warning",
    barClass: "bg-amber-500",
    trackClass: "bg-amber-100 dark:bg-amber-900/30",
    textClass: "text-amber-700 dark:text-amber-300",
  },
  quase_completa: {
    label: "Quase completa",
    badgeVariant: "gold",
    barClass: "bg-brand-gold-500",
    trackClass: "bg-brand-gold-100 dark:bg-brand-gold-700/20",
    textClass: "text-brand-gold-700 dark:text-brand-gold-300",
  },
  completa: {
    label: "Completa",
    badgeVariant: "success",
    barClass: "bg-emerald-500",
    trackClass: "bg-emerald-100 dark:bg-emerald-900/30",
    textClass: "text-emerald-700 dark:text-emerald-300",
  },
};

export const PROGRESS_STATUS_ORDER: ProgressStatus[] = [
  "nao_iniciada",
  "em_preenchimento",
  "quase_completa",
  "completa",
];
