"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { getSession } from "@/modules/identity/presentation/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

function isAdmin(role: string): boolean {
  return role === "coordenacao" || role === "secretaria";
}

function canEditOwn(session: { role: string; studentId: string | null }, studentId: string): boolean {
  if (isAdmin(session.role)) return true;
  if (session.role === "aluno" && session.studentId === studentId) return true;
  return false;
}

// =====================================================================
// Contato
// =====================================================================
const contactSchema = z.object({
  studentId: z.string().uuid(),
  whatsapp: z.string().optional(),
  phone_secondary: z.string().optional(),
  email_personal: z.string().email().or(z.literal("")).optional(),
  notes: z.string().optional(),
});

export async function updateContactAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = contactSchema.safeParse({
    studentId: formData.get("studentId"),
    whatsapp: formData.get("whatsapp") ?? undefined,
    phone_secondary: formData.get("phone_secondary") ?? undefined,
    email_personal: formData.get("email_personal") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { studentId, ...payload } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();
  const { error } = await supabase.from("student_contacts").upsert({
    student_id: studentId,
    ...payload,
    updated_by: session.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Endereço + Origem
// =====================================================================
const addressSchema = z.object({
  studentId: z.string().uuid(),
  street: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  landmark: z.string().optional(),
  origin_in_amapa: z.enum(["true", "false"]).optional(),
  from_other_state: z.enum(["true", "false"]).optional(),
  origin_state: z.string().optional(),
  origin_city: z.string().optional(),
  naturality_city: z.string().optional(),
  naturality_state: z.string().optional(),
});

export async function updateAddressAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { studentId, origin_in_amapa, from_other_state, naturality_city, naturality_state, ...rest } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();
  const { error: addressError } = await supabase.from("student_addresses").upsert({
    student_id: studentId,
    ...rest,
    origin_in_amapa: origin_in_amapa === "true",
    from_other_state: from_other_state === "true",
    updated_by: session.userId,
  });
  if (addressError) return { ok: false, error: addressError.message };

  if (naturality_city !== undefined || naturality_state !== undefined) {
    const { error: studentError } = await supabase
      .from("students")
      .update({
        naturality_city: naturality_city || null,
        naturality_state: naturality_state || null,
        updated_by: session.userId,
      })
      .eq("id", studentId);
    if (studentError) return { ok: false, error: studentError.message };
  }

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Contato de emergência (priority 1 ou 2)
// =====================================================================
const emergencySchema = z.object({
  studentId: z.string().uuid(),
  priority: z.coerce.number().refine((n) => n === 1 || n === 2),
  full_name: z.string().min(2, "Nome obrigatório"),
  relationship: z.string().optional(),
  phone: z.string().min(8, "Telefone obrigatório"),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function upsertEmergencyContactAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = emergencySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { studentId, priority, ...rest } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();
  const { error } = await supabase
    .from("emergency_contacts")
    .upsert({ student_id: studentId, priority, ...rest }, { onConflict: "student_id,priority" });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Saúde / Restrições — Política A (write-then-validate): grava direto
// mas marca validation_status='pendente' e gera PendingChange (D-005).
// =====================================================================
const healthSchema = z.object({
  studentId: z.string().uuid(),
  blood_type: z.enum(["A", "B", "AB", "O"]).optional().or(z.literal("")),
  rh_factor: z.enum(["+", "-"]).optional().or(z.literal("")),
  altura_cm: z.coerce.number().int().positive().optional().or(z.literal("")),
  peso_kg: z.coerce.number().positive().optional().or(z.literal("")),
  cirurgia_ocular: z.enum(["true", "false"]).optional(),
  cirurgia_ocular_obs: z.string().optional(),
  allergies: z.string().optional(),
  continuous_medication: z.string().optional(),
  chronic_disease: z.string().optional(),
  physical_restriction: z.string().optional(),
  dietary_restriction: z.string().optional(),
  uses_glasses: z.enum(["true", "false"]).optional(),
  medical_notes: z.string().optional(),
});

export async function updateHealthAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = healthSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { studentId, blood_type, rh_factor, uses_glasses, cirurgia_ocular, altura_cm, peso_kg, ...rest } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();

  // Lê valor anterior para registrar no PendingChange
  const { data: previous } = await supabase
    .from("health_restrictions")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  const newRow = {
    student_id: studentId,
    blood_type: blood_type || null,
    rh_factor: rh_factor || null,
    altura_cm: altura_cm !== "" && altura_cm !== undefined ? Number(altura_cm) : null,
    peso_kg: peso_kg !== "" && peso_kg !== undefined ? Number(peso_kg) : null,
    cirurgia_ocular: cirurgia_ocular === "true" ? true : cirurgia_ocular === "false" ? false : null,
    uses_glasses: uses_glasses === "true",
    ...rest,
    validation_status: "pendente",
    validated_by: null,
    validated_at: null,
    last_updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("health_restrictions").upsert(newRow);
  if (error) return { ok: false, error: error.message };

  // Só cria PendingChange se foi o aluno; admin já valida implícito.
  if (session.role === "aluno") {
    await supabase.from("pending_changes").insert({
      student_id: studentId,
      context: "health",
      entity: "health_restrictions",
      field: "*",
      previous_value: previous ?? null,
      new_value: newRow,
      requested_by: session.userId,
      status: "pendente",
    });
  }

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Resumo operacional — APENAS Coordenação (campo curado p/ Instrutor)
// =====================================================================
const operationalSummarySchema = z.object({
  studentId: z.string().uuid(),
  operational_summary: z.string().max(300, "Máx. 300 caracteres"),
});

export async function updateOperationalSummaryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };
  if (session.role !== "coordenacao") return { ok: false, error: "Apenas Coordenação" };

  const parsed = operationalSummarySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createServerClientUntyped();
  const { error } = await supabase
    .from("health_restrictions")
    .update({ operational_summary: parsed.data.operational_summary })
    .eq("student_id", parsed.data.studentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${parsed.data.studentId}`);
  return { ok: true };
}

// =====================================================================
// Validar / Recusar PendingChange (Coordenação)
// =====================================================================
const validatePendingSchema = z.object({
  pendingId: z.string().uuid(),
  decision: z.enum(["validar", "recusar"]),
  reason: z.string().optional(),
});

export async function resolvePendingChangeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };
  if (session.role !== "coordenacao" && session.role !== "secretaria") {
    return { ok: false, error: "Apenas Coordenação ou Secretaria" };
  }

  const parsed = validatePendingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { pendingId, decision, reason } = parsed.data;
  if (decision === "recusar" && !reason?.trim()) {
    return { ok: false, error: "Informe o motivo da recusa" };
  }

  const supabase = createServerClientUntyped();
  const { data: pending } = await supabase
    .from("pending_changes")
    .select("*")
    .eq("id", pendingId)
    .maybeSingle();
  if (!pending) return { ok: false, error: "Pendência não encontrada" };

  const newStatus = decision === "validar" ? "validado" : "recusado";

  const { error: e1 } = await supabase
    .from("pending_changes")
    .update({
      status: newStatus,
      resolved_by: session.userId,
      resolved_at: new Date().toISOString(),
      reason: reason ?? null,
    })
    .eq("id", pendingId);
  if (e1) return { ok: false, error: e1.message };

  // Se validada e for de saúde, marca o registro de saúde como validado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = pending as any;
  if (newStatus === "validado" && p.entity === "health_restrictions") {
    await supabase
      .from("health_restrictions")
      .update({
        validation_status: "validado",
        validated_by: session.userId,
        validated_at: new Date().toISOString(),
      })
      .eq("student_id", p.student_id);
  }
  if (newStatus === "recusado" && p.entity === "health_restrictions") {
    await supabase
      .from("health_restrictions")
      .update({
        validation_status: "recusado",
        validated_by: session.userId,
        validated_at: new Date().toISOString(),
      })
      .eq("student_id", p.student_id);
  }

  revalidatePath("/coordenacao/pendencias");
  revalidatePath(`/coordenacao/alunos/${p.student_id}`);
  return { ok: true };
}

// =====================================================================
// Administração (Número, Fase, Canga) — APENAS Coordenação
// =====================================================================
const adminStudentSchema = z.object({
  studentId: z.string().uuid(),
  studentNumber: z.coerce.number().int().min(1).max(100),
  pelotao: z.enum(["CFO I", "CFO II", "CFO III"]),
  cangaStudentId: z.string().uuid().or(z.literal("")).optional().nullable(),
});

export async function updateStudentAdminAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };
  if (session.role !== "coordenacao") return { ok: false, error: "Apenas Coordenação pode alterar esses dados." };

  const parsed = adminStudentSchema.safeParse({
    studentId: formData.get("studentId"),
    studentNumber: formData.get("studentNumber"),
    pelotao: formData.get("pelotao"),
    cangaStudentId: formData.get("cangaStudentId") || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { studentId, studentNumber, pelotao, cangaStudentId } = parsed.data;

  if (cangaStudentId === studentId) {
    return { ok: false, error: "Um aluno não pode ser canga de si mesmo." };
  }

  const supabase = createServerClientUntyped();

  // 1. Atualizar dados cadastrais críticos (número e pelotão/fase)
  const { error: studentError } = await supabase
    .from("students")
    .update({
      student_number: studentNumber,
      pelotao: pelotao,
      updated_by: session.userId,
    })
    .eq("id", studentId);

  if (studentError) {
    if (studentError.code === "23505") {
      return { ok: false, error: "Este número já está em uso por outro aluno nesta turma." };
    }
    return { ok: false, error: studentError.message };
  }

  // 2. Atualizar canga (desativar anterior, e se fornecido, inserir novo)
  const { error: deactivateError } = await supabase
    .from("canga_assignments")
    .update({ is_current: false })
    .eq("student_id", studentId)
    .eq("is_current", true);

  if (deactivateError) return { ok: false, error: deactivateError.message };

  if (cangaStudentId) {
    // Desativa também a canga atual do outro lado se desejado, mas a constraint é simples:
    // apenas uma canga ativa por aluno_id.
    const { error: cangaError } = await supabase
      .from("canga_assignments")
      .insert({
        student_id: studentId,
        canga_student_id: cangaStudentId,
        assigned_by: session.userId,
        is_current: true,
        assigned_at: new Date().toISOString().split("T")[0],
      });

    if (cangaError) return { ok: false, error: cangaError.message };
  }

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Logística — Aluno (própria) ou Coordenação/Secretaria
// =====================================================================
const logisticsSchema = z.object({
  studentId: z.string().uuid(),
  has_fixed_residence_macapa: z.enum(["true", "false"]).optional(),
  course_address: z.string().optional(),
  has_family_in_ap: z.enum(["true", "false"]).optional(),
  local_contact: z.string().optional(),
});

export async function updateLogisticsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = logisticsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { studentId, has_fixed_residence_macapa, has_family_in_ap, ...rest } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();
  const { error } = await supabase.from("student_logistics").upsert({
    student_id: studentId,
    ...rest,
    has_fixed_residence_macapa: has_fixed_residence_macapa === "true" ? true : has_fixed_residence_macapa === "false" ? false : null,
    has_family_in_ap: has_family_in_ap === "true" ? true : has_family_in_ap === "false" ? false : null,
    updated_by: session.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Identificação pessoal — Aluno (própria) ou Admin
// =====================================================================
const identificationSchema = z.object({
  studentId: z.string().uuid(),
  sex: z.enum(["M", "F"]).or(z.literal("")).optional(),
  birth_date: z.string().optional(),
  nationality: z.string().optional(),
  naturality_state: z.string().optional(),
  naturality_city: z.string().optional(),
  marital_status: z.string().optional(),
  education_level: z.string().optional(),
  graduation_type: z.string().optional(),
  graduation_name: z.string().optional(),
  professional_experience: z.string().optional(),
  voter_id: z.string().optional(),
  voter_zone: z.string().optional(),
  voter_section: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  email_personal: z.string().email().or(z.literal("")).optional(),
});

export async function updateIdentificationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = identificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { studentId, sex, birth_date, email_personal, ...rest } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();

  const { error: studentError } = await supabase
    .from("students")
    .update({
      sex: sex || null,
      birth_date: birth_date || null,
      ...rest,
      updated_by: session.userId,
    })
    .eq("id", studentId);

  if (studentError) return { ok: false, error: studentError.message };

  if (email_personal !== undefined) {
    const { error: contactError } = await supabase.from("student_contacts").upsert({
      student_id: studentId,
      email_personal: email_personal || null,
    });
    if (contactError) return { ok: false, error: contactError.message };
  }

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Veículo / CNH — Aluno (próprio) ou Admin
// =====================================================================
const vehicleSchema = z.object({
  studentId: z.string().uuid(),
  has_vehicle: z.enum(["true", "false"]).optional(),
  vehicle_type: z.string().optional(),
  plate: z.string().optional(),
  has_cnh: z.enum(["true", "false"]).optional(),
  cnh_category: z.string().optional(),
  cnh_valid_until: z.string().optional(),
  cnh_attached: z.enum(["true", "false"]).optional(),
  notes: z.string().optional(),
});

export async function updateVehicleAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { studentId, has_vehicle, has_cnh, cnh_attached, cnh_valid_until, ...rest } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const boolOrNull = (v: "true" | "false" | undefined) =>
    v === "true" ? true : v === "false" ? false : null;

  const supabase = createServerClientUntyped();
  const { error } = await supabase.from("vehicles").upsert({
    student_id: studentId,
    ...rest,
    has_vehicle: boolOrNull(has_vehicle),
    has_cnh: boolOrNull(has_cnh),
    cnh_attached: boolOrNull(cnh_attached),
    cnh_valid_until: cnh_valid_until || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

