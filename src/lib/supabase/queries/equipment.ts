/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

// =====================================================================
// Tipos
// =====================================================================
export interface EquipmentCategoryRow {
  id: string;
  ordinal: number;
  name: string;
  description: string | null;
  section_ordinal: number;
  section_name: string;
}

export interface EquipmentRequirementRow {
  id: string;
  category_id: string;
  name: string;
  short_description: string | null;
  quantity: number;
  unit: string;
  mandatory: boolean;
  applicability: "masculino" | "feminino" | "todos" | "condicional";
  phase: "quarentena" | "inicio" | "posterior";
  notes: string | null;
  active: boolean;
}

export interface StudentEquipmentStatusRow {
  id: string;
  student_id: string;
  requirement_id: string;
  status:
    | "ok"
    | "comprado"
    | "vai_chegar"
    | "falta_comprar"
    | "em_duvida"
    | "inadequado"
    | "nao_se_aplica"
    | "pendente_validacao";
  student_notes: string | null;
  validation_status: "nao_validado" | "validado" | "reprovado";
  validated_by: string | null;
  validated_at: string | null;
  updated_at: string;
}

export interface CategoryWithItems {
  category: EquipmentCategoryRow;
  requirements: EquipmentRequirementRow[];
  statuses: Record<string, StudentEquipmentStatusRow>;
}

// =====================================================================
// Queries
// =====================================================================

/** Carrega categorias + requisitos ativos, agrupados por categoria. */
export async function fetchEquipmentChecklist(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<CategoryWithItems[]> {
  const [catsRes, reqsRes, statusRes] = await Promise.all([
    supabase
      .from("equipment_categories")
      .select("id, ordinal, name, description, section_ordinal, section_name")
      .order("ordinal"),
    supabase
      .from("equipment_requirements")
      .select(
        "id, category_id, name, short_description, quantity, unit, mandatory, applicability, phase, notes, active",
      )
      .eq("active", true)
      .order("name"),
    supabase
      .from("student_equipment_status")
      .select(
        "id, student_id, requirement_id, status, student_notes, validation_status, validated_by, validated_at, updated_at",
      )
      .eq("student_id", studentId),
  ]);

  const categories = (catsRes.data ?? []) as EquipmentCategoryRow[];
  const requirements = (reqsRes.data ?? []) as EquipmentRequirementRow[];
  const rawStatuses = (statusRes.data ?? []) as StudentEquipmentStatusRow[];

  // index statuses por requirement_id
  const statusMap: Record<string, StudentEquipmentStatusRow> = {};
  for (const s of rawStatuses) {
    statusMap[s.requirement_id] = s;
  }

  // index requirements por category_id
  const reqsByCategory: Record<string, EquipmentRequirementRow[]> = {};
  for (const r of requirements) {
    if (!reqsByCategory[r.category_id]) reqsByCategory[r.category_id] = [];
    reqsByCategory[r.category_id]!.push(r);
  }

  return categories
    .filter((cat) => (reqsByCategory[cat.id]?.length ?? 0) > 0)
    .map((cat) => ({
      category: cat,
      requirements: reqsByCategory[cat.id] ?? [],
      statuses: statusMap,
    }));
}
