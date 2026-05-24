/**
 * Base para Value Objects imutáveis.
 * Igualdade por valor estrutural, não por referência.
 */
export abstract class ValueObject<T extends object> {
  protected readonly props: Readonly<T>;

  constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<T>): boolean {
    if (!(other instanceof this.constructor)) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
