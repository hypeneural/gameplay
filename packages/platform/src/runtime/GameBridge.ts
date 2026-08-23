import type { GameBridgeEvent } from '../contracts/index.js';

type Listener = (event: GameBridgeEvent) => void;

export class GameBridge {
  private readonly listeners = new Set<Listener>();

  emit(event: GameBridgeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
