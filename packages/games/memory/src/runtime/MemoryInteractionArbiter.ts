import type { MemoryTurn } from '../domain/MemoryTurn.js';

export interface MemoryInteractionState {
  readonly hinting: boolean;
  readonly paused: boolean;
}

/** Presentation guards live beside the runtime; the domain remains engine-free. */
export function canRevealMemoryCard(
  turn: MemoryTurn,
  cardId: string,
  presentation: MemoryInteractionState,
): boolean {
  if (presentation.paused || presentation.hinting) return false;
  if (turn.phase !== 'ready' && turn.phase !== 'one-open') return false;
  return turn.cards.some((card) => card.id === cardId && card.status === 'down');
}
