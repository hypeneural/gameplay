import { assertPuzzleCellIndex, type PuzzleBoard, type PuzzleSwap } from './PuzzleBoard.js';

export interface PuzzleSelection {
  readonly selectedIndex: number | null;
}

export interface TapSwapResult {
  readonly selection: PuzzleSelection;
  readonly swap: PuzzleSwap | null;
}

export const emptyPuzzleSelection: PuzzleSelection = { selectedIndex: null };

/**
 * Maps the accessible tap–tap alternative into the same swap command used by
 * drag input. Input adapters decide how to apply the returned command.
 */
export function selectPuzzleCell(
  board: PuzzleBoard,
  selection: PuzzleSelection,
  tappedIndex: number,
): TapSwapResult {
  assertPuzzleCellIndex(board, tappedIndex);

  if (selection.selectedIndex === null) {
    return { selection: { selectedIndex: tappedIndex }, swap: null };
  }

  assertPuzzleCellIndex(board, selection.selectedIndex);
  if (selection.selectedIndex === tappedIndex) {
    return { selection: emptyPuzzleSelection, swap: null };
  }

  return {
    selection: emptyPuzzleSelection,
    swap: { firstIndex: selection.selectedIndex, secondIndex: tappedIndex },
  };
}
