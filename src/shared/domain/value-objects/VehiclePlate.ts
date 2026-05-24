import { ValueObject } from "../ValueObject";
import { type Result, ok, err } from "../Result";

interface VehiclePlateProps {
  value: string;
}

const MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
const ANTIGA = /^[A-Z]{3}[0-9]{4}$/;

export class VehiclePlate extends ValueObject<VehiclePlateProps> {
  get value(): string {
    return this.props.value;
  }

  isMercosul(): boolean {
    return MERCOSUL.test(this.props.value);
  }

  static create(raw: string): Result<VehiclePlate> {
    const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!MERCOSUL.test(normalized) && !ANTIGA.test(normalized)) {
      return err("Placa inválida. Use formato Mercosul (ABC1D23) ou antigo (ABC1234)");
    }
    return ok(new VehiclePlate({ value: normalized }));
  }
}
