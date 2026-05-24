import { randomUUID } from "node:crypto";

export class UniqueId {
  private readonly _value: string;

  constructor(value?: string) {
    this._value = value ?? randomUUID();
  }

  get value(): string {
    return this._value;
  }

  equals(other: UniqueId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
