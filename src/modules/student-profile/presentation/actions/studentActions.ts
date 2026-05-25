"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { getSession } from "@/modules/identity/presentation/session";
import {
  maskPhone,
  maskCEP,
  maskUF,
  maskPlate,
  maskVoter,
  maskCPF,
  isValidPhone,
  isValidCEP,
  isValidUF,
  isValidPlate,
  isValidCPF,
  nullIfEmpty,
  cleanSpaces,
  normalizeName,
  hasAtLeastTwoWords,
} from "@/lib/masks";

// Zod helper: campo string opcional com trim e "" → undefined.
const optionalTrimmed = () =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v.trim() === "" ? undefined : v.trim()));

const optionalPhone = () =>
  optionalTrimmed().refine(
    (v) => v === undefined || isValidPhone(v),
    "Telefone deve ter 10 ou 11 dígitos (DDD + número).",
  );

const optionalCEP = () =>
  optionalTrimmed().refine(
    (v) => v === undefined || isValidCEP(v),
    "CEP deve ter 8 dígitos.",
  );

const optionalUF = () =>
  optionalTrimmed().refine(
    (v) => v === undefined || isValidUF(v),
    "UF inválida.",
  );

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
  whatsapp: optionalPhone(),
  phone_secondary: optionalPhone(),
  email_personal: z
    .string()
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim()))
    .refine(
      (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "E-mail inválido.",
    ),
  notes: optionalTrimmed(),
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
  const { studentId, whatsapp, phone_secondary, email_personal, notes } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();
  const { error } = await supabase.from("student_contacts").upsert({
    student_id: studentId,
    whatsapp: whatsapp ? maskPhone(whatsapp) : null,
    phone_secondary: phone_secondary ? maskPhone(phone_secondary) : null,
    email_personal: nullIfEmpty(email_personal),
    notes: nullIfEmpty(notes),
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
  street: optionalTrimmed(),
  district: optionalTrimmed(),
  city: optionalTrimmed(),
  state: optionalUF(),
  zip: optionalCEP(),
  landmark: optionalTrimmed(),
  origin_in_amapa: z.enum(["true", "false"]).optional(),
  from_other_state: z.enum(["true", "false"]).optional(),
  origin_state: optionalUF(),
  origin_city: optionalTrimmed(),
  naturality_city: optionalTrimmed(),
  naturality_state: optionalUF(),
});

export async function updateAddressAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const {
    studentId,
    origin_in_amapa,
    from_other_state,
    naturality_city,
    naturality_state,
    street,
    district,
    city,
    state,
    zip,
    landmark,
    origin_state,
    origin_city,
  } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();
  const { error: addressError } = await supabase.from("student_addresses").upsert({
    student_id: studentId,
    street: nullIfEmpty(street),
    district: nullIfEmpty(district),
    city: nullIfEmpty(city),
    state: state ? maskUF(state) : null,
    zip: zip ? maskCEP(zip) : null,
    landmark: nullIfEmpty(landmark),
    origin_state: origin_state ? maskUF(origin_state) : null,
    origin_city: nullIfEmpty(origin_city),
    origin_in_amapa: origin_in_amapa === "true",
    from_other_state: from_other_state === "true",
    updated_by: session.userId,
  });
  if (addressError) return { ok: false, error: addressError.message };

  if (naturality_city !== undefined || naturality_state !== undefined) {
    const { error: studentError } = await supabase
      .from("students")
      .update({
        naturality_city: nullIfEmpty(naturality_city),
        naturality_state: naturality_state ? maskUF(naturality_state) : null,
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
  full_name: z
    .string()
    .transform((v) => cleanSpaces(v))
    .refine((v) => v.length >= 3, "Nome obrigatório.")
    .refine(hasAtLeastTwoWords, "Informe nome e pelo menos um sobrenome."),
  relationship: optionalTrimmed(),
  phone: z
    .string()
    .transform((v) => v?.trim() ?? "")
    .refine(
      (v) => isValidPhone(v),
      "Telefone deve ter 10 ou 11 dígitos (DDD + número).",
    ),
  address: optionalTrimmed(),
  notes: optionalTrimmed(),
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
  const { studentId, priority, full_name, relationship, phone, address, notes } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();
  const { error } = await supabase.from("emergency_contacts").upsert(
    {
      student_id: studentId,
      priority,
      full_name: normalizeName(full_name),
      relationship: nullIfEmpty(relationship),
      phone: maskPhone(phone),
      address: nullIfEmpty(address),
      notes: nullIfEmpty(notes),
    },
    { onConflict: "student_id,priority" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Saúde / Restrições — Política A (write-then-validate): grava direto
// mas marca validation_status='pendente' e gera PendingChange (D-005).
// =====================================================================
const healthSchema = z
  .object({
    studentId: z.string().uuid(),
    blood_type: z.enum(["A", "B", "AB", "O"]).optional().or(z.literal("")),
    rh_factor: z.enum(["+", "-"]).optional().or(z.literal("")),
    altura_cm: z
      .union([z.literal(""), z.coerce.number().int().min(100, "Altura entre 100 e 250 cm.").max(250, "Altura entre 100 e 250 cm.")])
      .optional(),
    peso_kg: z
      .union([z.literal(""), z.coerce.number().min(30, "Peso entre 30 e 200 kg.").max(200, "Peso entre 30 e 200 kg.")])
      .optional(),
    cirurgia_ocular: z.enum(["true", "false"]).optional(),
    cirurgia_ocular_obs: optionalTrimmed(),
    allergies: optionalTrimmed(),
    continuous_medication: optionalTrimmed(),
    chronic_disease: optionalTrimmed(),
    physical_restriction: optionalTrimmed(),
    dietary_restriction: optionalTrimmed(),
    uses_glasses: z.enum(["true", "false"]).optional(),
    medical_notes: optionalTrimmed(),
  })
  .superRefine((data, ctx) => {
    if (data.cirurgia_ocular === "true" && !data.cirurgia_ocular_obs) {
      ctx.addIssue({
        code: "custom",
        path: ["cirurgia_ocular_obs"],
        message: "Descreva a cirurgia ocular realizada.",
      });
    }
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
  birth_date: optionalTrimmed().refine(
    (v) => v === undefined || !Number.isNaN(Date.parse(v)),
    "Data de nascimento inválida.",
  ),
  nationality: optionalTrimmed(),
  naturality_state: optionalUF(),
  naturality_city: optionalTrimmed(),
  marital_status: optionalTrimmed(),
  education_level: optionalTrimmed(),
  graduation_type: optionalTrimmed(),
  graduation_name: optionalTrimmed(),
  professional_experience: optionalTrimmed(),
  voter_id: optionalTrimmed(),
  voter_zone: optionalTrimmed(),
  voter_section: optionalTrimmed(),
  father_name: optionalTrimmed(),
  mother_name: optionalTrimmed(),
  cpf: optionalTrimmed().refine(
    (v) => v === undefined || isValidCPF(v),
    "CPF inválido."
  ),
  rg: optionalTrimmed(),
  pis: optionalTrimmed(),
  email_personal: optionalTrimmed().refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "E-mail inválido.",
  ),
  religion: optionalTrimmed(),
  religion_other: optionalTrimmed(),
  has_religious_restriction: z.enum(["true", "false"]).optional(),
  religious_restriction_notes: optionalTrimmed(),
}).superRefine((data, ctx) => {
  const isAdventist = data.religion === "Adventista";
  const hasRestriction = data.has_religious_restriction === "true";

  if (data.religion === "Outra" && !data.religion_other) {
    ctx.addIssue({
      code: "custom",
      path: ["religion_other"],
      message: "Por favor, informe qual a religião/crença.",
    });
  }

  if ((isAdventist || hasRestriction) && !data.religious_restriction_notes) {
    ctx.addIssue({
      code: "custom",
      path: ["religious_restriction_notes"],
      message: "Por favor, detalhe as considerações ou restrições operacionais associadas.",
    });
  }
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

  const {
    studentId,
    sex,
    birth_date,
    email_personal,
    nationality,
    naturality_state,
    naturality_city,
    marital_status,
    education_level,
    graduation_type,
    graduation_name,
    professional_experience,
    voter_id,
    voter_zone,
    voter_section,
    father_name,
    mother_name,
    cpf,
    rg,
    pis,
    religion,
    religion_other,
    has_religious_restriction,
    religious_restriction_notes,
  } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const supabase = createServerClientUntyped();

  // Lê valor anterior para comparar ou registrar na pendência
  const { data: previousStudent } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  const { error: studentError } = await supabase
    .from("students")
    .update({
      sex: sex || null,
      birth_date: nullIfEmpty(birth_date),
      nationality: nullIfEmpty(nationality),
      naturality_state: naturality_state ? maskUF(naturality_state) : null,
      naturality_city: nullIfEmpty(naturality_city),
      marital_status: nullIfEmpty(marital_status),
      education_level: nullIfEmpty(education_level),
      graduation_type: nullIfEmpty(graduation_type),
      graduation_name: nullIfEmpty(graduation_name),
      professional_experience: nullIfEmpty(professional_experience),
      voter_id: voter_id ? maskVoter(voter_id) : null,
      voter_zone: nullIfEmpty(voter_zone),
      voter_section: nullIfEmpty(voter_section),
      father_name: father_name ? normalizeName(father_name) : null,
      mother_name: mother_name ? normalizeName(mother_name) : null,
      cpf: cpf ? maskCPF(cpf) : null,
      rg: nullIfEmpty(rg),
      pis: nullIfEmpty(pis),
      religion: nullIfEmpty(religion),
      religion_other: nullIfEmpty(religion_other),
      has_religious_restriction: has_religious_restriction === "true" ? true : has_religious_restriction === "false" ? false : null,
      religious_restriction_notes: nullIfEmpty(religious_restriction_notes),
      updated_by: session.userId,
    })
    .eq("id", studentId)
    .select()
    .single();

  if (studentError) return { ok: false, error: studentError.message };

  // Verifica se o aluno declarou restrição ou religião Adventista para gerar pendência
  const isAdventistNow = religion === "Adventista";
  const hasRestrictionNow = has_religious_restriction === "true";
  
  // Condição para gerar pendência:
  // Se o usuário que atualizou é Aluno e ele recém declarou restrição/adventista (ou modificou).
  if (session.role === "aluno" && (isAdventistNow || hasRestrictionNow)) {
    const wasAdventistBefore = previousStudent?.religion === "Adventista";
    const hadRestrictionBefore = previousStudent?.has_religious_restriction === true;
    
    // Gera a pendência se os campos relevantes mudaram
    if (
      !wasAdventistBefore || 
      !hadRestrictionBefore || 
      previousStudent?.religious_restriction_notes !== religious_restriction_notes
    ) {
      await supabase.from("pending_changes").insert({
        student_id: studentId,
        context: "identification",
        entity: "students",
        field: "religious_info",
        previous_value: {
          religion: previousStudent?.religion,
          has_religious_restriction: previousStudent?.has_religious_restriction,
          religious_restriction_notes: previousStudent?.religious_restriction_notes,
        },
        new_value: {
          religion,
          has_religious_restriction: has_religious_restriction === "true",
          religious_restriction_notes,
        },
        requested_by: session.userId,
        status: "pendente",
      });
    }
  }

  if (email_personal !== undefined) {
    const { error: contactError } = await supabase.from("student_contacts").upsert({
      student_id: studentId,
      email_personal: nullIfEmpty(email_personal),
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
const vehicleSchema = z
  .object({
    studentId: z.string().uuid(),
    has_vehicle: z.enum(["true", "false"]).optional(),
    vehicle_type: optionalTrimmed(),
    vehicle_brand_model: optionalTrimmed(),
    plate: optionalTrimmed(),
    has_cnh: z.enum(["true", "false"]).optional(),
    cnh_category: optionalTrimmed(),
    cnh_valid_until: optionalTrimmed(),
    cnh_attached: z.enum(["true", "false"]).optional(),
    notes: optionalTrimmed(),
  })
  .superRefine((data, ctx) => {
    if (data.has_vehicle === "true") {
      if (!data.vehicle_type)
        ctx.addIssue({ code: "custom", path: ["vehicle_type"], message: "Informe o tipo de veículo." });
      if (!data.vehicle_brand_model || cleanSpaces(data.vehicle_brand_model).length < 3)
        ctx.addIssue({
          code: "custom",
          path: ["vehicle_brand_model"],
          message: "Informe a marca e o modelo do veículo (mín. 3 caracteres).",
        });
      if (!data.plate || !isValidPlate(data.plate))
        ctx.addIssue({
          code: "custom",
          path: ["plate"],
          message: "Placa inválida. Use AAA-0000 ou AAA-0A00.",
        });
    }
    if (data.has_cnh === "true") {
      if (!data.cnh_category)
        ctx.addIssue({ code: "custom", path: ["cnh_category"], message: "Selecione a categoria da CNH." });
      if (!data.cnh_valid_until)
        ctx.addIssue({ code: "custom", path: ["cnh_valid_until"], message: "Informe a validade da CNH." });
    }
  });

export async function updateVehicleAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const {
    studentId,
    has_vehicle,
    has_cnh,
    cnh_attached,
    cnh_valid_until,
    vehicle_type,
    vehicle_brand_model,
    plate,
    cnh_category,
    notes,
  } = parsed.data;
  if (!canEditOwn(session, studentId)) return { ok: false, error: "Sem permissão" };

  const boolOrNull = (v: "true" | "false" | undefined) =>
    v === "true" ? true : v === "false" ? false : null;

  const supabase = createServerClientUntyped();
  const { error } = await supabase.from("vehicles").upsert({
    student_id: studentId,
    has_vehicle: boolOrNull(has_vehicle),
    has_cnh: boolOrNull(has_cnh),
    cnh_attached: boolOrNull(cnh_attached),
    vehicle_type: nullIfEmpty(vehicle_type),
    vehicle_brand_model: vehicle_brand_model ? cleanSpaces(vehicle_brand_model) : null,
    plate: plate ? maskPlate(plate) : null,
    cnh_category: nullIfEmpty(cnh_category),
    cnh_valid_until: nullIfEmpty(cnh_valid_until),
    notes: nullIfEmpty(notes),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

// =====================================================================
// Status da matrícula — apenas Coordenação
// =====================================================================
const enrollmentStatusSchema = z.object({
  studentId: z.string().uuid(),
  enrollment_status: z.enum(["pendente", "confirmada"]),
  enrollment_id: z
    .string()
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? undefined : v.trim())),
});

export async function updateEnrollmentStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };
  if (session.role !== "coordenacao") {
    return { ok: false, error: "Apenas Coordenação pode alterar o status da matrícula." };
  }

  const parsed = enrollmentStatusSchema.safeParse({
    studentId: formData.get("studentId"),
    enrollment_status: formData.get("enrollment_status"),
    enrollment_id: formData.get("enrollment_id") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { studentId, enrollment_status, enrollment_id } = parsed.data;
  const supabase = createServerClientUntyped();

  const update: Record<string, unknown> = {
    enrollment_status,
    updated_by: session.userId,
  };
  // Só sobrescreve enrollment_id quando o form enviar valor (pendente ou
  // confirmada). Form vazio NÃO apaga matrícula previamente registrada.
  if (enrollment_id !== undefined) {
    update.enrollment_id = enrollment_id;
  }

  const { error } = await supabase.from("students").update(update).eq("id", studentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/coordenacao/alunos");
  revalidatePath("/aluno/ficha");
  return { ok: true };
}

