import type { GameDifficulty } from '@christmas-games/platform';

export const memoryEasyPairCount = 4;
export const memoryStandardPairCount = 6;

/**
 * The shell owns when voluntary progression is offered. The game only turns
 * that explicit choice into a small, fixed deck size, never into a function
 * of the complete session catalogue.
 */
export function pairCountForMemoryDifficulty(difficulty?: GameDifficulty): 4 | 6 {
  return difficulty === 'desafio' ? memoryStandardPairCount : memoryEasyPairCount;
}
