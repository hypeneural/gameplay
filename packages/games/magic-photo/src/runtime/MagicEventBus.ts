import type { MagicEvent } from '../domain/MagicPhotoStateMachine.js';

/** Typed local bus; photo URLs and customer identity never enter gameplay events. */
export class MagicEventBus {
  private readonly listeners = new Set<(event: MagicEvent) => void>();
  subscribe(listener: (event: MagicEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  publish(events: readonly MagicEvent[]): void {
    for (const event of events) for (const listener of this.listeners) listener(event);
  }
  clear(): void {
    this.listeners.clear();
  }
}
