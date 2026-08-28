import type { Random } from '@christmas-games/platform';

export interface MemoryCard {
  readonly id: string;
  readonly pairId: string;
}

/** Each selected photo owns exactly two cards and one source texture. */
export function createMemoryDeck(
  pairIds: readonly string[],
  random: Random,
): readonly MemoryCard[] {
  const cards = pairIds.flatMap((pairId) => [
    { id: `${pairId}:left`, pairId },
    { id: `${pairId}:right`, pairId },
  ]);

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = random.int(0, index);
    const current = cards[index]!;
    cards[index] = cards[swapIndex]!;
    cards[swapIndex] = current;
  }

  return cards;
}
