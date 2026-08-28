export interface PuzzleTopology {
  readonly columns: number;
  readonly rows: number;
}

export type PuzzleDifficulty = 'normal' | 'desafio';

const portraitTopology: PuzzleTopology = { columns: 3, rows: 4 };
const landscapeTopology: PuzzleTopology = { columns: 4, rows: 3 };
const challengeTopology: PuzzleTopology = { columns: 4, rows: 4 };

/**
 * Selects the board topology once, when a run is created. Viewport changes
 * may change geometry, but never the board's identity, piece ids or solution.
 */
export function selectPuzzleTopology(
  photoAspectRatio: number,
  difficulty: PuzzleDifficulty = 'normal',
): PuzzleTopology {
  if (!Number.isFinite(photoAspectRatio) || photoAspectRatio <= 0) {
    throw new Error('Puzzle topology needs a positive finite photo aspect ratio.');
  }

  if (difficulty === 'desafio') return challengeTopology;
  return photoAspectRatio > 1 ? landscapeTopology : portraitTopology;
}
