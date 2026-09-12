import { describe, expect, it } from 'vitest';
import {
  applyTicTacToeMove,
  EMPTY_TIC_TAC_TOE_BOARD,
  findTicTacToeWinner,
  findTicTacToeWinningLine,
  isLegalTicTacToeMove,
  isTicTacToeDraw,
  isTicTacToeTerminal,
  legalTicTacToeMoves,
  ticTacToeDefinition,
  WIN_LINES,
  type TicTacToeBoard,
} from '../src/index.js';

function boardWithLine(line: readonly number[]): TicTacToeBoard {
  const board = [...EMPTY_TIC_TAC_TOE_BOARD];
  for (const cell of line) board[cell] = 'player-a';
  return board as unknown as TicTacToeBoard;
}

describe('Tic-Tac-Toe rules', () => {
  it('declares a one-photo game with an optional local duel', () => {
    expect(ticTacToeDefinition).toMatchObject({
      id: 'tic-tac-toe',
      minPhotos: 1,
      recommendedPhotos: 2,
      photoSelection: 'subset',
    });
  });

  it.each(WIN_LINES)('recognizes winning line %j', (...line) => {
    const board = boardWithLine(line);

    expect(findTicTacToeWinningLine(board)).toEqual(line);
    expect(findTicTacToeWinner(board)).toBe('player-a');
    expect(isTicTacToeTerminal(board)).toBe(true);
  });

  it('keeps the canonical board immutable and refuses an occupied cell', () => {
    const afterFirstMove = applyTicTacToeMove(EMPTY_TIC_TAC_TOE_BOARD, 'player-a', 4);

    expect(EMPTY_TIC_TAC_TOE_BOARD[4]).toBeNull();
    expect(afterFirstMove[4]).toBe('player-a');
    expect(isLegalTicTacToeMove(afterFirstMove, 4)).toBe(false);
    expect(legalTicTacToeMoves(afterFirstMove)).toHaveLength(8);
    expect(() => applyTicTacToeMove(afterFirstMove, 'player-b', 4)).toThrow('already occupied');
  });

  it('recognizes a full board without a winner as a draw', () => {
    const draw: TicTacToeBoard = [
      'player-a',
      'player-b',
      'player-a',
      'player-a',
      'player-b',
      'player-b',
      'player-b',
      'player-a',
      'player-a',
    ];

    expect(findTicTacToeWinner(draw)).toBeNull();
    expect(isTicTacToeDraw(draw)).toBe(true);
    expect(isTicTacToeTerminal(draw)).toBe(true);
  });
});
