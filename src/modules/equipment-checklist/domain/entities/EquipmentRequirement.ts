import { Entity } from "@/shared/domain";
import type { UniqueId } from "@/shared/domain";

export type Applicability = "masculino" | "feminino" | "todos" | "condicional";
export type Phase = "quarentena" | "inicio" | "posterior";

interface EquipmentRequirementProps {
  categoryId: string;
  subcategory?: string;
  discipline?: string;
  name: string;
  shortDescription?: string;
  quantity: number;
  unit: string;
  mandatory: boolean;
  applicability: Applicability;
  phase: Phase;
  notes?: string;
  active: boolean;
}

export class EquipmentRequirement extends Entity<EquipmentRequirementProps> {
  get categoryId(): string { return this.props.categoryId; }
  get name(): string { return this.props.name; }
  get quantity(): number { return this.props.quantity; }
  get unit(): string { return this.props.unit; }
  get mandatory(): boolean { return this.props.mandatory; }
  get applicability(): Applicability { return this.props.applicability; }
  get phase(): Phase { return this.props.phase; }
  get active(): boolean { return this.props.active; }

  appliesTo(sex: "M" | "F"): boolean {
    if (this.props.applicability === "todos") return true;
    if (this.props.applicability === "masculino" && sex === "M") return true;
    if (this.props.applicability === "feminino" && sex === "F") return true;
    if (this.props.applicability === "condicional") return true; // decidido pela Coord — D-016
    return false;
  }

  static create(props: EquipmentRequirementProps, id?: UniqueId): EquipmentRequirement {
    return new EquipmentRequirement(props, id);
  }
}
