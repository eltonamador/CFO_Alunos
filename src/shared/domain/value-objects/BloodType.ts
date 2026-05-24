import { ValueObject } from "../ValueObject";
import { type Result, ok, err } from "../Result";

type ABO = "A" | "B" | "AB" | "O";
type RH = "+" | "-";

interface BloodTypeProps {
  abo: ABO;
  rh: RH;
}

export class BloodType extends ValueObject<BloodTypeProps> {
  get abo(): ABO {
    return this.props.abo;
  }
  get rh(): RH {
    return this.props.rh;
  }

  formatted(): string {
    return `${this.props.abo}${this.props.rh}`;
  }

  static create(abo: string, rh: string): Result<BloodType> {
    const validABO: ABO[] = ["A", "B", "AB", "O"];
    const validRH: RH[] = ["+", "-"];
    const aboUp = abo.toUpperCase() as ABO;
    if (!validABO.includes(aboUp)) return err("Tipo sanguíneo inválido. Use A, B, AB ou O");
    if (!validRH.includes(rh as RH)) return err("Fator RH inválido. Use + ou -");
    return ok(new BloodType({ abo: aboUp, rh: rh as RH }));
  }
}
