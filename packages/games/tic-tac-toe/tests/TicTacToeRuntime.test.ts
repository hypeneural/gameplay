import { createViewportLayout } from '@christmas-games/platform';
import { describe, expect, it } from 'vitest';
import {
  beginTicTacToePointerPress,
  canPlaceTicTacToeCell,
  canConfirmTicTacToePointerPress,
  createTicTacToeMatch,
  exceedsTicTacToePointerSlop,
  planTicTacToeBoardLayout,
  ticTacToeRectsOverlap,
} from '../src/index.js';

describe('Tic-Tac-Toe Board Lab', () => {
  it.each([
    [390, 844],
    [412, 915],
    [430, 932],
    [768, 1024],
  ])('keeps every touch cell comfortable at %ix%i', (width, height) => {
    const layout = planTicTacToeBoardLayout(createViewportLayout(width, height));

    expect(layout.cells).toHaveLength(9);
    expect(layout.cellSize).toBeGreaterThanOrEqual(52);
    expect(layout.boardSize).toBeLessThanOrEqual(Math.min(width - 32, 456));
  });

  it.each([
    [390, 844],
    [412, 915],
    [430, 932],
    [768, 1024],
  ])('keeps protected text, board and control areas separate at %ix%i', (width, height) => {
    const viewport = createViewportLayout(width, height);
    const setup = planTicTacToeBoardLayout(viewport, 'setup');
    const board = planTicTacToeBoardLayout(viewport, 'board');

    expect(ticTacToeRectsOverlap(setup.title, setup.score)).toBe(false);
    expect(ticTacToeRectsOverlap(setup.score, setup.status)).toBe(false);
    expect(ticTacToeRectsOverlap(setup.status, setup.coach)).toBe(false);
    expect(setup.selectionPhoto.x).toBeGreaterThanOrEqual(setup.actionArea.x);
    expect(setup.selectionPhoto.y).toBeGreaterThanOrEqual(setup.actionArea.y);
    expect(setup.selectionPhoto.x + setup.selectionPhoto.width).toBeLessThanOrEqual(
      setup.actionArea.x + setup.actionArea.width,
    );
    expect(setup.selectionPhoto.y + setup.selectionPhoto.height).toBeLessThanOrEqual(
      setup.actionArea.y + setup.actionArea.height,
    );
    expect(ticTacToeRectsOverlap(board.title, board.back)).toBe(false);
    expect(ticTacToeRectsOverlap(board.title, board.pause)).toBe(false);
    expect(board.status.y + board.status.height).toBeLessThan(board.board.y);
    expect(board.board.y + board.board.height).toBeLessThan(board.dock.y);
    expect(board.back.height).toBeGreaterThanOrEqual(44);
    expect(board.pause.height).toBeGreaterThanOrEqual(44);
  });

  it('blocks board input during presentation and pause before it reaches the domain', () => {
    const match = createTicTacToeMatch({ mode: 'santa', initialStarter: 'player-a' });

    expect(canPlaceTicTacToeCell(match, 'player-a', { paused: false, presentation: 'board' })).toBe(
      true,
    );
    expect(canPlaceTicTacToeCell(match, 'player-a', { paused: true, presentation: 'board' })).toBe(
      false,
    );
    expect(
      canPlaceTicTacToeCell(match, 'player-a', { paused: false, presentation: 'thinking' }),
    ).toBe(false);
    expect(canPlaceTicTacToeCell(match, 'player-b', { paused: false, presentation: 'board' })).toBe(
      false,
    );
  });
});

describe('Tic-Tac-Toe pointer arbiter', () => {
  it('confirms only the same pointer, cell and presentation epoch', () => {
    const press = beginTicTacToePointerPress(4, { id: 7, x: 100, y: 140 }, 12);

    expect(canConfirmTicTacToePointerPress(press, { id: 7, x: 106, y: 146 }, 12, 4)).toBe(true);
    expect(canConfirmTicTacToePointerPress(press, { id: 8, x: 106, y: 146 }, 12, 4)).toBe(false);
    expect(canConfirmTicTacToePointerPress(press, { id: 7, x: 106, y: 146 }, 13, 4)).toBe(false);
    expect(canConfirmTicTacToePointerPress(press, { id: 7, x: 106, y: 146 }, 12, 3)).toBe(false);
  });

  it('cancels the owning pointer only after it leaves the touch slop', () => {
    const press = beginTicTacToePointerPress(1, { id: 2, x: 20, y: 20 }, 4);

    expect(exceedsTicTacToePointerSlop(press, { id: 2, x: 26, y: 28 })).toBe(false);
    expect(exceedsTicTacToePointerSlop(press, { id: 2, x: 31, y: 20 })).toBe(true);
    expect(exceedsTicTacToePointerSlop(press, { id: 3, x: 100, y: 100 })).toBe(false);
  });
});
