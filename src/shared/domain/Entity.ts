import { UniqueId } from "./UniqueId";

/**
 * Base para Entidades com identidade por ID.
 */
export abstract class Entity<T> {
  protected readonly _id: UniqueId;
  protected props: T;

  constructor(props: T, id?: UniqueId) {
    this._id = id ?? new UniqueId();
    this.props = props;
  }

  get id(): UniqueId {
    return this._id;
  }

  equals(other: Entity<T>): boolean {
    if (!(other instanceof this.constructor)) return false;
    return this._id.equals(other._id);
  }
}
