"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/modules/identity/presentation/session";
import type { Json } from "@/lib/supabase/types";
import { academicCommandSchema } from "../application/commands";
import { AcademicDataError, academicError, createAcademicClient } from "../infrastructure/database";

export type ActionResult = { ok: boolean; message: string };

export async function academicAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess)
    return { ok: false, message: "Sessão inválida. Entre novamente antes de salvar." };
  const parsed = academicCommandSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const command = parsed.data;
  const instructorOperation = ["save_grade", "create_assessment"].includes(command.operation);
  if (session.role !== "coordenacao" && !(session.role === "instrutor" && instructorOperation)) {
    return { ok: false, message: "Seu perfil não tem permissão para esta operação." };
  }
  const client = createAcademicClient();
  try {
    if (session.role === "instrutor" && "offering_id" in command) {
      const { data, error } = await client
        .from("academic_assignments")
        .select("id")
        .eq("offering_id", command.offering_id)
        .eq("profile_id", session.userId)
        .eq("active", true)
        .limit(1);
      if (error) throw academicError(error);
      if (!data?.length)
        throw new AcademicDataError("Você não está designado para esta disciplina.");
    }
    switch (command.operation) {
      case "create_discipline": {
        const { operation: _, ...record } = command;
        const { error } = await client.from("academic_disciplines").insert(record);
        if (error) throw academicError(error);
        break;
      }
      case "create_offering": {
        const { error } = await client.rpc("academic_create_offering_ri", {
          p_class_id: command.class_id,
          p_discipline_id: command.discipline_id,
          p_academic_year: command.academic_year,
          p_workload_hours: command.workload_hours,
          p_vc_count: command.vc_count,
          p_decision_ref: command.decision_ref,
        });
        if (error) throw academicError(error);
        break;
      }
      case "configure_policy": {
        const { error } = await client.rpc("academic_configure_policy", {
          p_offering_id: command.offering_id,
          p_name: command.name,
          p_parameters: command.parameters as unknown as Json,
          p_decision_ref: command.decision_ref,
        });
        if (error) throw academicError(error);
        break;
      }
      case "assign": {
        const { operation: _, ...record } = command;
        const { error } = await client
          .from("academic_assignments")
          .insert({ ...record, profile_id: record.profile_id ?? null });
        if (error) throw academicError(error);
        break;
      }
      case "deactivate_assignment": {
        const { data, error } = await client
          .from("academic_assignments")
          .update({ active: false })
          .eq("id", command.assignment_id)
          .eq("offering_id", command.offering_id)
          .select("id");
        if (error) throw academicError(error);
        if (!data?.length) throw new AcademicDataError("Designação não encontrada.");
        break;
      }
      case "enroll": {
        const { error } = await client
          .from("academic_enrollments")
          .insert({ offering_id: command.offering_id, student_id: command.student_id });
        if (error) throw academicError(error);
        break;
      }
      case "create_assessment": {
        const { operation: _, ...record } = command;
        const { error } = await client
          .from("academic_assessments")
          .insert({ ...record, held_on: record.held_on || null });
        if (error) throw academicError(error);
        break;
      }
      case "save_grade": {
        if (command.expected_revision > 0 && command.reason.length < 5)
          throw new AcademicDataError("Informe o motivo da correção (mínimo de 5 caracteres).");
        const [enrollment, assessment] = await Promise.all([
          client
            .from("academic_enrollments")
            .select("id")
            .eq("id", command.enrollment_id)
            .eq("offering_id", command.offering_id)
            .maybeSingle(),
          client
            .from("academic_assessments")
            .select("id")
            .eq("id", command.assessment_id)
            .eq("offering_id", command.offering_id)
            .maybeSingle(),
        ]);
        if (enrollment.error || assessment.error)
          throw academicError(enrollment.error ?? assessment.error);
        if (!enrollment.data || !assessment.data)
          throw new AcademicDataError("Avaliação e cadete devem pertencer à mesma oferta.");
        const { error } = await client.rpc("academic_save_grade", {
          p_assessment_id: command.assessment_id,
          p_enrollment_id: command.enrollment_id,
          p_score: command.score,
          p_expected_revision: command.expected_revision,
          p_reason: command.reason,
        });
        if (error) throw academicError(error);
        break;
      }
      case "save_attendance": {
        const { data, error } = await client
          .from("academic_enrollments")
          .select("id")
          .eq("id", command.enrollment_id)
          .eq("offering_id", command.offering_id)
          .maybeSingle();
        if (error) throw academicError(error);
        if (!data) throw new AcademicDataError("Matrícula não encontrada nesta oferta.");
        const saved = await client.rpc("academic_save_attendance", {
          p_enrollment_id: command.enrollment_id,
          p_justified: command.justified_absences,
          p_unjustified: command.unjustified_absences,
          p_expected_revision: command.expected_revision,
          p_reason: command.reason,
        });
        if (saved.error) throw academicError(saved.error);
        break;
      }
    }
    for (const role of ["coordenacao", "secretaria", "instrutor", "aluno"]) {
      revalidatePath(`/${role}/academico`);
      if ("offering_id" in command) revalidatePath(`/${role}/academico/${command.offering_id}`);
    }
    return { ok: true, message: "Registro salvo. O histórico foi atualizado." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AcademicDataError ? error.message : academicError(error).message,
    };
  }
}
