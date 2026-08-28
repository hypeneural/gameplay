import type { MemoryCard } from './MemoryDeck.js';

export type MemoryCardStatus = 'down' | 'up' | 'matched';
export type MemoryTurnPhase =
  'ready' | 'one-open' | 'resolving-match' | 'resolving-mismatch' | 'completed';

export interface MemoryTurnCard extends MemoryCard {
  readonly status: MemoryCardStatus;
}

export interface MemoryTurn {
  readonly cards: readonly MemoryTurnCard[];
  readonly openCardIds: readonly string[];
  readonly matchedPairs: number;
  readonly phase: MemoryTurnPhase;
  readonly turns: number;
}

export type MemoryRejectionReason = 'not-selectable' | 'not-face-down';

export interface MemorySelectionResult {
  readonly accepted: boolean;
  readonly state: MemoryTurn;
  readonly rejection?: MemoryRejectionReason;
  readonly resolution?: 'match' | 'mismatch';
}

export function createMemoryTurn(deck: readonly MemoryCard[]): MemoryTurn {
  return {
    cards: deck.map((card) => ({ ...card, status: 'down' })),
    openCardIds: [],
    matchedPairs: 0,
    phase: 'ready',
    turns: 0,
  };
}

/** Accepts only a face-down card while the player can make a first or second choice. */
export function selectMemoryCard(state: MemoryTurn, cardId: string): MemorySelectionResult {
  if (state.phase !== 'ready' && state.phase !== 'one-open') {
    return { accepted: false, state, rejection: 'not-selectable' };
  }
  const card = state.cards.find((candidate) => candidate.id === cardId);
  if (!card || card.status !== 'down') {
    return { accepted: false, state, rejection: 'not-face-down' };
  }

  const cards = state.cards.map((candidate) =>
    candidate.id === cardId ? { ...candidate, status: 'up' as const } : candidate,
  );
  if (state.phase === 'ready') {
    return {
      accepted: true,
      state: { ...state, cards, openCardIds: [cardId], phase: 'one-open' },
    };
  }

  const firstId = state.openCardIds[0]!;
  const first = state.cards.find((candidate) => candidate.id === firstId)!;
  const resolution = first.pairId === card.pairId ? 'match' : 'mismatch';
  return {
    accepted: true,
    resolution,
    state: {
      ...state,
      cards,
      openCardIds: [firstId, cardId],
      phase: resolution === 'match' ? 'resolving-match' : 'resolving-mismatch',
      turns: state.turns + 1,
    },
  };
}

/** Settling is called by the runtime only after its visible resolution delay. */
export function settleMemoryTurn(state: MemoryTurn): MemoryTurn {
  if (state.phase !== 'resolving-match' && state.phase !== 'resolving-mismatch') return state;

  const shouldMatch = state.phase === 'resolving-match';
  const openIds = new Set(state.openCardIds);
  const cards = state.cards.map((card) => {
    if (!openIds.has(card.id)) return card;
    return { ...card, status: shouldMatch ? ('matched' as const) : ('down' as const) };
  });
  const matchedPairs = state.matchedPairs + (shouldMatch ? 1 : 0);
  const completed = shouldMatch && cards.every((card) => card.status === 'matched');
  return {
    ...state,
    cards,
    matchedPairs,
    openCardIds: [],
    phase: completed ? 'completed' : 'ready',
  };
}
