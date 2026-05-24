import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";
import type { BloodType } from "@/shared/domain";

export type ValidationStatus = "pendente" | "validado" | "recusado";

interface HealthRestrictionProps {
  studentId: string;
  bloodType?: BloodType;
  alturaCm?: number;
  pesoKg?: number;
  cirurgiaOcular?: boolean;
  cirurgiaOcularObs?: string;
  allergies?: string;
  continuousMedication?: string;
  chronicDisease?: string;
  physicalRestriction?: string;
  dietaryRestriction?: string;
  usesGlasses?: boolean;
  medicalDeclarationDocId?: string;
  medicalNotes?: string;
  /** Texto curto, curado pela Coordenação — único campo visível ao Instrutor. */
  operationalSummary?: string;
  validationStatus: ValidationStatus;
  validatedBy?: string;
  validatedAt?: Date;
  lastUpdatedAt: Date;
}

/** Campos clínicos brutos — NUNCA expostos ao Instrutor. */
export const CLINICAL_FIELDS = [
  "allergies",
  "continuousMedication",
  "chronicDisease",
  "physicalRestriction",
  "dietaryRestriction",
  "medicalNotes",
  "medicalDeclarationDocId",
] as const;

export class HealthRestriction extends Entity<HealthRestrictionProps> {
  get studentId(): string { return this.props.studentId; }
  get bloodType(): BloodType | undefined { return this.props.bloodType; }
  get alturaCm(): number | undefined { return this.props.alturaCm; }
  get pesoKg(): number | undefined { return this.props.pesoKg; }
  get cirurgiaOcular(): boolean | undefined { return this.props.cirurgiaOcular; }
  get cirurgiaOcularObs(): string | undefined { return this.props.cirurgiaOcularObs; }
  get validationStatus(): ValidationStatus { return this.props.validationStatus; }
  get operationalSummary(): string | undefined { return this.props.operationalSummary; }
  get allergies(): string | undefined { return this.props.allergies; }
  get continuousMedication(): string | undefined { return this.props.continuousMedication; }
  get chronicDisease(): string | undefined { return this.props.chronicDisease; }
  get physicalRestriction(): string | undefined { return this.props.physicalRestriction; }
  get dietaryRestriction(): string | undefined { return this.props.dietaryRestriction; }
  get usesGlasses(): boolean | undefined { return this.props.usesGlasses; }
  get medicalNotes(): string | undefined { return this.props.medicalNotes; }

  hasAnyRestriction(): boolean {
    return !!(
      this.props.allergies ||
      this.props.continuousMedication ||
      this.props.chronicDisease ||
      this.props.physicalRestriction ||
      this.props.dietaryRestriction
    );
  }

  isPendingValidation(): boolean {
    return this.props.validationStatus === "pendente";
  }

  /**
   * Aluno atualiza dados clínicos → status volta a pendente.
   * Operational summary permanece o antigo até Coordenação editar.
   */
  updateClinicalData(
    data: Partial<Pick<HealthRestrictionProps,
      "bloodType" | "alturaCm" | "pesoKg" | "cirurgiaOcular" | "cirurgiaOcularObs" |
      "allergies" | "continuousMedication" | "chronicDisease" |
      "physicalRestriction" | "dietaryRestriction" | "usesGlasses" | "medicalNotes"
    >>
  ): void {
    this.props = {
      ...this.props,
      ...data,
      validationStatus: "pendente",
      validatedBy: undefined,
      validatedAt: undefined,
      lastUpdatedAt: new Date(),
    };
  }

  /** Apenas Coordenação — cura o texto para o Instrutor. */
  updateOperationalSummary(summary: string): void {
    this.props = { ...this.props, operationalSummary: summary };
  }

  validate(validatedBy: string): void {
    this.props = {
      ...this.props,
      validationStatus: "validado",
      validatedBy,
      validatedAt: new Date(),
    };
  }

  reject(validatedBy: string): void {
    this.props = {
      ...this.props,
      validationStatus: "recusado",
      validatedBy,
      validatedAt: new Date(),
    };
  }

  static create(props: HealthRestrictionProps, id?: UniqueId): HealthRestriction {
    return new HealthRestriction(props, id);
  }
}
