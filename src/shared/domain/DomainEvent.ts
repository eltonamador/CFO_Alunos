export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
}

export type DomainEventHandler<E extends DomainEvent> = (event: E) => Promise<void>;

/**
 * Bus em memória simples para o MVP.
 * Substituir por fila (Supabase Realtime / outbox) quando necessário.
 */
class DomainEventBus {
  private handlers: Map<string, DomainEventHandler<DomainEvent>[]> = new Map();

  subscribe<E extends DomainEvent>(eventName: string, handler: DomainEventHandler<E>): void {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...existing, handler as DomainEventHandler<DomainEvent>]);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? [];
    await Promise.all(handlers.map((h) => h(event)));
  }
}

export const domainEvents = new DomainEventBus();
