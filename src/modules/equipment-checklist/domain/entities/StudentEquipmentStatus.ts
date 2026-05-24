import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";

export type EquipmentItemStatus =
  | "ok"
  | "comprado"
  | "vai_chegar"
  | "falta_comprar"
  | "em_duvida"
  | "inadequado"
  | "nao_se_aplica"
  | "pendente_validacao";

export type ItemValidationStatus = "nao_validado" | "validado" | "reprovado";

const STATUS_LABELS: Record<EquipmentItemStatus, string> = {
  ok: "OK",
  comprado: "Comprado",
  vai_chegar: "Ainda vai chegar",
  falta_comprar: "Falta comprar",
  em_duvida: "Em dúvida",
  inadequado: "Inadequado",
  nao_se_aplica: "Não se aplica",
  pendente_validacao: "Pendente de validação",
};

interface StudentEquipmentStatusProps {
  studentId: string;
  requirementId: string;
  status: EquipmentItemStatus;
  studentNotes?: string;
  attachmentPath?: string;
  validationStatus: ItemValidationStatus;
  validatedBy?: string;
  validatedAt?: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export class StudentEquipmentStatus extends Entity<StudentEquipmentStatusProps> {
  get studentId(): string { return this.props.studentId; }
  get requirementId(): string { return this.props.requirementId; }
  get status(): EquipmentItemStatus { return this.props.status; }
  get studentNotes(): string | undefined { return this.props.studentNotes; }
  get attachmentPath(): string | undefined { return this.props.attachmentPath; }
  get validationStatus(): ItemValidationStatus { return this.props.validationStatus; }

  statusLabel(): string {
    return STATUS_LABELS[this.props.status];
  }

  updateByStudent(
    status: EquipmentItemStatus,
    notes?: string,
    attachmentPath?: string,
    updatedBy?: string,
  ): void {
    // Mudança de status leva a validação pendente novamente
    const newValidation: ItemValidationStatus =
      status === "ok" || status === "nao_se_aplica" ? "nao_validado" : "nao_validado";

    this.props = {
      ...this.props,
      status,
      studentNotes: notes,
      attachmentPath: attachmentPath ?? this.props.attachmentPath,
      validationStatus: newValidation,
      updatedAt: new Date(),
      updatedBy,
    };
  }

  validate(validatedBy: string): void {
    this.props = {
      ...this.props,
      validationStatus: "validado",
      validatedBy,
      validatedAt: new Date(),
    };
  }

  reprove(validatedBy: string): void {
    this.props = {
      ...this.props,
      validationStatus: "reprovado",
      status: "inadequado",
      validatedBy,
      validatedAt: new Date(),
    };
  }

  static create(props: Omit<StudentEquipmentStatusProps, "updatedAt">, id?: UniqueId): StudentEquipmentStatus {
    return new StudentEquipmentStatus({ ...props, updatedAt: new Date() }, id);
  }
}
