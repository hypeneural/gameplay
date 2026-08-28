import type { GameBridgeEvent } from '../contracts/index.js';

type Listener = (event: GameBridgeEvent) => void;

export class GameBridge {
  private readonly listeners = new Set<Listener>();
  /**
   * Retains one typed event per live run so a host can recover from the tiny
   * interval between acquiring a mount lease and attaching its React state.
   * Callers must release it when the run is destroyed; this is deliberately
   * not an event history or an analytics store.
   */
  private readonly latestEvents = new Map<string, GameBridgeEvent>();

  emit(event: GameBridgeEvent): void {
    this.latestEvents.set(event.runId, event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  latest(runId: string): GameBridgeEvent | undefined {
    return this.latestEvents.get(runId);
  }

  release(runId: string): void {
    this.latestEvents.delete(runId);
  }
}
