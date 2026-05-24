import type { EquipmentRequirement } from "../entities/EquipmentRequirement";
import type { StudentEquipmentStatus } from "../entities/StudentEquipmentStatus";
import type { Sex } from "@/modules/student-profile/domain/entities/Student";

/**
 * Função pura — sem IO, totalmente testável.
 * Implementa as regras 10 e 11 do prompt.
 *
 * Conta como pendência:
 *   - falta_comprar, em_duvida, vai_chegar, inadequado
 *   - comprado (sem validação = nao_validado)
 *   - item obrigatório sem status (pendente_validacao implícito)
 *
 * NÃO conta:
 *   - ok, nao_se_aplica
 *   - comprado validado
 *   - item opcional que o aluno não preencheu
 *   - item que não se aplica ao sexo do aluno
 */
export function computePendingItems(params: {
  requirements: EquipmentRequirement[];
  statuses: Map<string, StudentEquipmentStatus>; // keyed by requirementId
  studentSex: Sex;
}): { requirementId: string; reason: string }[] {
  const { requirements, statuses, studentSex } = params;
  const pending: { requirementId: string; reason: string }[] = [];

  for (const req of requirements) {
    if (!req.active) continue;
    if (!req.appliesTo(studentSex)) continue;

    const s = statuses.get(req.id.value);

    // Item obrigatório sem registro de status
    if (!s) {
      if (req.mandatory) {
        pending.push({ requirementId: req.id.value, reason: "Sem status informado" });
      }
      continue;
    }

    const status = s.status;
    const validation = s.validationStatus;

    if (status === "ok") continue;
    if (status === "nao_se_aplica") continue;

    if (status === "comprado" && validation === "validado") continue;

    if (
      status === "falta_comprar" ||
      status === "em_duvida" ||
      status === "vai_chegar" ||
      status === "inadequado" ||
      status === "pendente_validacao"
    ) {
      pending.push({ requirementId: req.id.value, reason: s.statusLabel() });
      continue;
    }

    // comprado não validado
    if (status === "comprado" && validation !== "validado") {
      pending.push({ requirementId: req.id.value, reason: "Comprado — aguardando validação" });
    }
  }

  return pending;
}
