import type { MemoryTurn } from './MemoryTurn.js';

export function formatMemoryProgress(turn: MemoryTurn): string {
  const totalPairs = turn.cards.length / 2;
  return `${turn.matchedPairs} de ${totalPairs} pares`;
}
