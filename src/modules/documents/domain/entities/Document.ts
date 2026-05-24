import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";

export type DocumentType =
  | "rg_cpf"
  | "cnh"
  | "comprovante_residencia"
  | "foto_3x4"
  | "declaracao_medica"
  | "outro";

export type DocumentStatus =
  | "pendente"
  | "enviado"
  | "em_analise"
  | "validado"
  | "recusado";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  rg_cpf: "RG / CPF",
  cnh: "CNH",
  comprovante_residencia: "Comprovante de Residência",
  foto_3x4: "Foto 3x4",
  declaracao_medica: "Declaração Médica",
  outro: "Outro",
};

interface DocumentProps {
  studentId: string;
  docType: DocumentType;
  storagePath: string;
  status: DocumentStatus;
  rejectionReason?: string;
  validatedBy?: string;
  validatedAt?: Date;
  linkedHealthRestrictionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Document extends Entity<DocumentProps> {
  get studentId(): string { return this.props.studentId; }
  get docType(): DocumentType { return this.props.docType; }
  get storagePath(): string { return this.props.storagePath; }
  get status(): DocumentStatus { return this.props.status; }
  get rejectionReason(): string | undefined { return this.props.rejectionReason; }
  get validatedAt(): Date | undefined { return this.props.validatedAt; }

  typeLabel(): string {
    return DOCUMENT_TYPE_LABELS[this.props.docType];
  }

  validate(validatedBy: string): void {
    this.props = {
      ...this.props,
      status: "validado",
      validatedBy,
      validatedAt: new Date(),
      rejectionReason: undefined,
      updatedAt: new Date(),
    };
  }

  reject(validatedBy: string, reason: string): void {
    if (!reason.trim()) throw new Error("Motivo da recusa é obrigatório");
    this.props = {
      ...this.props,
      status: "recusado",
      validatedBy,
      validatedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date(),
    };
  }

  /** Aluno reenvia após recusa. */
  resubmit(newStoragePath: string): void {
    if (this.props.status !== "recusado") {
      throw new Error("Só é possível reenviar documentos recusados");
    }
    this.props = {
      ...this.props,
      storagePath: newStoragePath,
      status: "enviado",
      rejectionReason: undefined,
      validatedBy: undefined,
      validatedAt: undefined,
      updatedAt: new Date(),
    };
  }

  static create(props: Omit<DocumentProps, "createdAt" | "updatedAt">, id?: UniqueId): Document {
    return new Document(
      { ...props, createdAt: new Date(), updatedAt: new Date() },
      id,
    );
  }
}
