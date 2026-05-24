/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

// =====================================================================
// Tipos de retorno (matching schema das migrations F4)
// =====================================================================

export interface StudentListRow {
  id: string;
  student_number: number | null;
  war_name: string;
  full_name: string;
  pelotao: string | null;
  photo_path: string | null;
  situation: string;
}

export interface StudentDetailRow extends StudentListRow {
  class_id: string;
  sex: "M" | "F" | null;
  birth_date: string | null;
  nationality: string | null;
  naturality_state: string | null;
  naturality_city: string | null;
  marital_status: string | null;
  education_level: string | null;
  graduation_type: string | null;
  graduation_name: string | null;
  professional_experience: string | null;
  enrollment_id: string | null;
  cpf: string | null;
  rg: string | null;
  pis: string | null;
  voter_id: string | null;
  voter_zone: string | null;
  voter_section: string | null;
  father_name: string | null;
  mother_name: string | null;
  presentation_date: string | null;
}

export interface StudentContactRow {
  student_id: string;
  whatsapp: string | null;
  phone_secondary: string | null;
  email_personal: string | null;
  email_institutional: string | null;
  notes: string | null;
}

export interface StudentAddressRow {
  student_id: string;
  street: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  landmark: string | null;
  origin_in_amapa: boolean | null;
  from_other_state: boolean | null;
  origin_state: string | null;
  origin_city: string | null;
}

export interface EmergencyContactRow {
  id: string;
  student_id: string;
  priority: 1 | 2;
  full_name: string;
  relationship: string | null;
  phone: string;
  address: string | null;
  notes: string | null;
}

export interface HealthRestrictionRow {
  student_id: string;
  blood_type: "A" | "B" | "AB" | "O" | null;
  rh_factor: "+" | "-" | null;
  altura_cm: number | null;
  peso_kg: number | null;
  cirurgia_ocular: boolean | null;
  cirurgia_ocular_obs: string | null;
  allergies: string | null;
  continuous_medication: string | null;
  chronic_disease: string | null;
  physical_restriction: string | null;
  dietary_restriction: string | null;
  uses_glasses: boolean | null;
  medical_notes: string | null;
  operational_summary: string | null;
  validation_status: "pendente" | "validado" | "recusado";
  validated_at: string | null;
}

export interface InstructorCardRow {
  id: string;
  class_id: string;
  student_number: number | null;
  war_name: string;
  full_name: string;
  pelotao: string | null;
  photo_path: string | null;
  whatsapp: string | null;
  email_institutional: string | null;
  origin_label: "amapa" | "outro_estado" | null;
  has_vehicle: boolean;
  has_restriction: boolean;
  operational_summary: string | null;
  canga_war_name: string | null;
  canga_number: number | null;
}

// =====================================================================
// Lista (Coordenação / Secretaria) — full
// =====================================================================
export async function listStudents(
  supabase: SupabaseClient<any, any, any>,
  options: { classId?: string; query?: string; pelotao?: string } = {},
): Promise<StudentListRow[]> {
  let q = supabase
    .from("students")
    .select("id, student_number, war_name, full_name, pelotao, photo_path, situation")
    .is("deleted_at", null)
    .order("student_number", { ascending: true, nullsFirst: false });

  if (options.classId) q = q.eq("class_id", options.classId);
  if (options.pelotao) q = q.eq("pelotao", options.pelotao);

  const term = options.query?.trim();
  if (term) {
    const asNumber = Number(term);
    if (Number.isInteger(asNumber)) {
      q = q.or(`student_number.eq.${asNumber},war_name.ilike.%${term}%,full_name.ilike.%${term}%`);
    } else {
      q = q.or(`war_name.ilike.%${term}%,full_name.ilike.%${term}%`);
    }
  }

  const { data } = await q;
  return (data ?? []) as StudentListRow[];
}

// =====================================================================
// Lista básica (Instrutor + Aluno) — sem dados sensíveis
// =====================================================================
export async function listClassBasic(
  supabase: SupabaseClient<any, any, any>,
  classId?: string,
  query?: string,
): Promise<StudentListRow[]> {
  let q = supabase
    .from("v_student_class_basic")
    .select("*")
    .order("student_number", { ascending: true, nullsFirst: false });

  if (classId) q = q.eq("class_id", classId);

  const term = query?.trim();
  if (term) {
    const asNumber = Number(term);
    if (Number.isInteger(asNumber)) {
      q = q.or(`student_number.eq.${asNumber},war_name.ilike.%${term}%`);
    } else {
      q = q.ilike("war_name", `%${term}%`);
    }
  }

  const { data } = await q;
  return ((data ?? []) as Array<Omit<StudentListRow, "situation" | "full_name"> & { war_name: string }>).map(
    (r) => ({
      id: r.id,
      student_number: r.student_number ?? null,
      war_name: r.war_name,
      full_name: r.war_name,
      pelotao: r.pelotao ?? null,
      photo_path: r.photo_path ?? null,
      situation: "matriculado",
    }),
  );
}

// =====================================================================
// Ficha completa (Coordenação)
// =====================================================================
export async function fetchStudent(
  supabase: SupabaseClient<any, any, any>,
  id: string,
): Promise<StudentDetailRow | null> {
  const { data } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  return (data as StudentDetailRow | null) ?? null;
}

export async function fetchStudentContact(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<StudentContactRow | null> {
  const { data } = await supabase
    .from("student_contacts")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as StudentContactRow | null) ?? null;
}

export async function fetchStudentAddress(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<StudentAddressRow | null> {
  const { data } = await supabase
    .from("student_addresses")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as StudentAddressRow | null) ?? null;
}

export async function fetchEmergencyContacts(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<EmergencyContactRow[]> {
  const { data } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("student_id", studentId)
    .order("priority", { ascending: true });
  return (data ?? []) as EmergencyContactRow[];
}

export async function fetchHealthRestriction(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<HealthRestrictionRow | null> {
  const { data } = await supabase
    .from("health_restrictions")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as HealthRestrictionRow | null) ?? null;
}

// =====================================================================
// Card do Instrutor (LGPD-safe via view)
// =====================================================================
export async function fetchInstructorCard(
  supabase: SupabaseClient<any, any, any>,
  id: string,
): Promise<InstructorCardRow | null> {
  const { data } = await supabase
    .from("v_student_card_instructor")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as InstructorCardRow | null) ?? null;
}

export async function searchInstructorCards(
  supabase: SupabaseClient<any, any, any>,
  query: string,
  classId?: string,
): Promise<InstructorCardRow[]> {
  let q = supabase
    .from("v_student_card_instructor")
    .select("*")
    .order("student_number", { ascending: true, nullsFirst: false });

  if (classId) q = q.eq("class_id", classId);

  const term = query.trim();
  if (term) {
    const asNumber = Number(term);
    if (Number.isInteger(asNumber)) {
      q = q.or(`student_number.eq.${asNumber},war_name.ilike.%${term}%`);
    } else {
      q = q.or(`war_name.ilike.%${term}%,full_name.ilike.%${term}%`);
    }
  }

  const { data } = await q.limit(50);
  return (data ?? []) as InstructorCardRow[];
}

// =====================================================================
// Storage signed URLs
// =====================================================================
export async function signedPhotoUrl(
  supabase: SupabaseClient<any, any, any>,
  path: string | null,
  ttlSeconds = 1800,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("student-photos").createSignedUrl(path, ttlSeconds);
  return data?.signedUrl ?? null;
}

// =====================================================================
// Canga Query
// =====================================================================
export interface StudentCanga {
  canga_id: string;
  canga_war_name: string;
  canga_number: number | null;
}

export async function fetchStudentCanga(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<StudentCanga | null> {
  const { data: assignment } = await supabase
    .from("canga_assignments")
    .select("canga_student_id")
    .eq("student_id", studentId)
    .eq("is_current", true)
    .maybeSingle();

  if (!assignment?.canga_student_id) return null;

  const { data: cangaStudent } = await supabase
    .from("students")
    .select("id, war_name, student_number")
    .eq("id", assignment.canga_student_id)
    .maybeSingle();

  if (!cangaStudent) return null;

  return {
    canga_id: cangaStudent.id,
    canga_war_name: cangaStudent.war_name,
    canga_number: cangaStudent.student_number ?? null,
  };
}

// =====================================================================
// Logística
// =====================================================================
export interface StudentLogisticsRow {
  student_id: string;
  has_fixed_residence_macapa: boolean | null;
  course_address: string | null;
  needs_housing: boolean | null;
  has_family_in_ap: boolean | null;
  local_contact: string | null;
}

export async function fetchStudentLogistics(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<StudentLogisticsRow | null> {
  const { data } = await supabase
    .from("student_logistics")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as StudentLogisticsRow | null) ?? null;
}

// =====================================================================
// Veículo / CNH
// =====================================================================
export interface StudentVehicleRow {
  student_id: string;
  has_vehicle: boolean | null;
  vehicle_type: string | null;
  plate: string | null;
  has_cnh: boolean | null;
  cnh_category: string | null;
  cnh_valid_until: string | null;
  cnh_attached: boolean | null;
  available_for_deployment: boolean | null;
  notes: string | null;
}

export async function fetchStudentVehicle(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<StudentVehicleRow | null> {
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as StudentVehicleRow | null) ?? null;
}

// =====================================================================
// Auditoria / Logs
// =====================================================================
export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  before_data: any;
  after_data: any;
  reason: string | null;
  created_at: string;
  actor_name: string | null;
}

export async function fetchStudentAuditLogs(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<AuditLogRow[]> {
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("entity_id", studentId)
    .order("created_at", { ascending: false });

  if (!logs || logs.length === 0) return [];

  const actorIds = Array.from(new Set(logs.map((l: any) => l.actor_id).filter(Boolean)));

  let profileMap: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);

    if (profiles) {
      profileMap = profiles.reduce((acc: any, curr: any) => {
        acc[curr.id] = curr.full_name;
        return acc;
      }, {});
    }
  }

  return logs.map((l: any) => ({
    id: l.id,
    actor_id: l.actor_id,
    actor_role: l.actor_role,
    entity: l.entity,
    entity_id: l.entity_id,
    action: l.action,
    before_data: l.before_data,
    after_data: l.after_data,
    reason: l.reason,
    created_at: l.created_at,
    actor_name: l.actor_id ? (profileMap[l.actor_id] || "Usuário do Sistema") : "Sistema (Gatilho)",
  }));
}


