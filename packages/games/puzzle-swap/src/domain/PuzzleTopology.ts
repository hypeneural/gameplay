export interface PuzzleTopology {
  readonly columns: number;
  readonly rows: number;
}

const portraitTopology: PuzzleTopology = { columns: 3, rows: 4 };
const landscapeTopology: PuzzleTopology = { columns: 4, rows: 3 };

/**
 * Selects the board topology once, when a run is created. Viewport changes
 * may change geometry, but never the board's identity, piece ids or solution.
 */
export function selectPuzzleTopology(photoAspectRatio: number): PuzzleTopology {
  if (!Number.isFinite(photoAspectRatio) || photoAspectRatio <= 0) {
    throw new Error('Puzzle topology needs a positive finite photo aspect ratio.');
  }

  return photoAspectRatio > 1 ? landscapeTopology : portraitTopology;
}
