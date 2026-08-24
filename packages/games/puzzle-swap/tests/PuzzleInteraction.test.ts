import { describe, expect, it } from 'vitest';
import {
  createIdleAssistState,
  createPuzzleBoard,
  createSolvedPuzzleBoard,
  emptyPuzzleSelection,
  findPuzzleHintSwap,
  recordSuccessfulPuzzleMove,
  requestIdleAssist,
  selectPuzzleCell,
} from '../src/index.js';

describe('Puzzle interaction domain', () => {
  it('turns tap–tap into the same swap command as drag input', () => {
    const board = createSolvedPuzzleBoard(3, 2);
    const firstTap = selectPuzzleCell(board, emptyPuzzleSelection, 1);
    const secondTap = selectPuzzleCell(board, firstTap.selection, 4);

    expect(firstTap).toEqual({ selection: { selectedIndex: 1 }, swap: null });
    expect(secondTap).toEqual({
      selection: emptyPuzzleSelection,
      swap: { firstIndex: 1, secondIndex: 4 },
    });
  });

  it('lets a player cancel a selected cell without a move', () => {
    const board = createSolvedPuzzleBoard(2, 2);
    const result = selectPuzzleCell(board, { selectedIndex: 2 }, 2);

    expect(result).toEqual({ selection: emptyPuzzleSelection, swap: null });
    expect(() => selectPuzzleCell(board, emptyPuzzleSelection, 4)).toThrow('outside this board');
  });

  it('shows one non-solving idle highlight, then resets after a successful move', () => {
    let now = 1_000;
    const clock = { now: () => now };
    const board = createPuzzleBoard(2, 2, [1, 0, 2, 3]);
    const initial = createIdleAssistState(clock);

    now += 6_999;
    expect(requestIdleAssist(board, initial, clock, 7_000).hint).toBeNull();

    now += 1;
    const due = requestIdleAssist(board, initial, clock, 7_000);
    expect(due.hint).toEqual({ kind: 'highlight-piece', cellIndex: 0, pieceId: 1 });
    expect(requestIdleAssist(board, due.state, clock, 7_000).hint).toBeNull();

    const afterMove = recordSuccessfulPuzzleMove(clock);
    now += 7_000;
    expect(requestIdleAssist(board, afterMove, clock, 7_000).hint).not.toBeNull();
  });

  it('does not ask a completed puzzle to show an idle hint', () => {
    const clock = { now: () => 8_000 };
    const state = { lastSuccessfulMoveAtMs: 0, hasShownSinceLastMove: false };

    expect(requestIdleAssist(createSolvedPuzzleBoard(2, 2), state, clock, 7_000).hint).toBeNull();
  });

  it('turns an incorrect cell into a two-piece, non-solving hint', () => {
    const board = createPuzzleBoard(3, 2, [1, 2, 0, 3, 4, 5]);

    expect(findPuzzleHintSwap(board)).toEqual({ targetCellIndex: 0, sourceCellIndex: 2 });
    expect(findPuzzleHintSwap(board, 1)).toEqual({ targetCellIndex: 1, sourceCellIndex: 0 });
    expect(findPuzzleHintSwap(createSolvedPuzzleBoard(2, 2))).toBeNull();
  });
});
