import type { GameViewport } from '@christmas-games/platform';
import type { CellIndex } from '../domain/TicTacToeTypes.js';

export interface TicTacToeRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface TicTacToeCellPlacement {
  readonly cell: CellIndex;
  readonly x: number;
  readonly y: number;
}

export type TicTacToeLayoutState =
  'setup' | 'setup-with-back' | 'board' | 'round-result' | 'match-result';

export interface TicTacToeBoardLayout {
  readonly actionArea: TicTacToeRect;
  readonly back: TicTacToeRect;
  readonly board: TicTacToeRect;
  readonly boardSize: number;
  readonly boardTop: number;
  readonly cellSize: number;
  readonly cells: readonly TicTacToeCellPlacement[];
  readonly coach: TicTacToeRect;
  readonly dock: TicTacToeRect;
  readonly gap: number;
  readonly pause: TicTacToeRect;
  readonly score: TicTacToeRect;
  readonly selectionPhoto: TicTacToeRect;
  readonly status: TicTacToeRect;
  readonly title: TicTacToeRect;
}

const minimumTouchTarget = 52;
const panelGap = 8;

function rect(x: number, y: number, width: number, height: number): TicTacToeRect {
  return { x, y, width, height };
}

function horizontalCenter(area: TicTacToeRect): number {
  return area.x + area.width / 2;
}

/**
 * Produces every protected area from one viewport. Views must use these
 * rectangles rather than choosing a local y coordinate, which keeps title,
 * copy and board from competing on short portrait screens.
 */
export function planTicTacToeBoardLayout(
  viewport: GameViewport,
  state: TicTacToeLayoutState = 'setup',
): TicTacToeBoardLayout {
  const horizontalInset = Math.max(16, Math.round(viewport.width * 0.05));
  const contentRight = viewport.width - horizontalInset;
  const contentWidth = contentRight - horizontalInset;
  const controlHeight = 44;
  const backWidth = Math.min(104, Math.max(84, Math.round(contentWidth * 0.28)));
  const pauseWidth = 76;
  const header = rect(horizontalInset, viewport.safeTop, contentWidth, controlHeight);
  const back = rect(header.x, header.y, backWidth, controlHeight);
  const pause = rect(header.x + header.width - pauseWidth, header.y, pauseWidth, controlHeight);
  const isSetup = state === 'setup' || state === 'setup-with-back';
  const titleLeft = state === 'setup' ? header.x : back.x + back.width + panelGap;
  const titleRight = pause.x - panelGap;
  const title = rect(titleLeft, header.y, Math.max(1, titleRight - titleLeft), controlHeight);
  const score = rect(horizontalInset, header.y + header.height + 4, contentWidth, 22);
  const status = rect(horizontalInset, score.y + score.height + 4, contentWidth, 48);
  const coachHeight = isSetup ? 42 : 0;
  const coach = rect(
    horizontalInset,
    status.y + status.height + panelGap,
    contentWidth,
    coachHeight,
  );
  const boardTop = coach.y + coach.height + (coachHeight > 0 ? 18 : 20);
  const dockHeight = 56;
  const dock = rect(
    horizontalInset,
    viewport.height - viewport.safeBottom - dockHeight,
    contentWidth,
    dockHeight,
  );
  const gap = Math.max(8, Math.min(14, Math.round(viewport.width * 0.028)));
  const boardWidth = Math.min(contentWidth, 456);
  const boardHeightBudget = Math.max(0, dock.y - boardTop - 18);
  const boardSize = Math.max(
    minimumTouchTarget * 3 + gap * 2,
    Math.min(boardWidth, boardHeightBudget),
  );
  const board = rect((viewport.width - boardSize) / 2, boardTop, boardSize, boardSize);
  const cellSize = (boardSize - gap * 2) / 3;
  const cells = Array.from({ length: 9 }, (_, index) => {
    const cell = index as CellIndex;
    return {
      cell,
      x: board.x + (index % 3) * (cellSize + gap) + cellSize / 2,
      y: board.y + Math.floor(index / 3) * (cellSize + gap) + cellSize / 2,
    };
  });
  const actionTop = coach.y + coach.height + 54;
  const actionBottom = Math.min(dock.y - 24, viewport.height - viewport.safeBottom - 24);
  const actionArea = rect(
    horizontalInset,
    Math.min(actionTop, actionBottom),
    contentWidth,
    Math.max(52, actionBottom - Math.min(actionTop, actionBottom)),
  );
  const selectionPhotoWidth = Math.min(200, Math.max(128, Math.round(contentWidth * 0.44)));
  const selectionPhotoHeight = Math.max(
    0,
    Math.min(
      160,
      Math.round(selectionPhotoWidth * 0.94),
      Math.max(0, Math.round(actionArea.height * 0.42)),
    ),
  );
  const selectionPhoto = rect(
    (viewport.width - selectionPhotoWidth) / 2,
    actionArea.y + 8,
    selectionPhotoWidth,
    selectionPhotoHeight,
  );

  return {
    actionArea,
    back,
    board,
    boardSize,
    boardTop,
    cellSize,
    cells,
    coach,
    dock,
    gap,
    pause,
    score,
    selectionPhoto,
    status,
    title,
  };
}

export function ticTacToeRectCenter(area: TicTacToeRect): readonly [number, number] {
  return [horizontalCenter(area), area.y + area.height / 2];
}

export function ticTacToeRectsOverlap(a: TicTacToeRect, b: TicTacToeRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
