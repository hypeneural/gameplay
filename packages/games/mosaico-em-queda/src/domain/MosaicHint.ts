import type { ActiveTetromino, MosaicBoard, MosaicEngineState, Rotation } from './EngineTypes.js';
import {
  clearCompleteRows,
  findCompleteRows,
  fitsTetromino,
  lockTetromino,
} from './MosaicBoard.js';
import { tryRotateClockwise } from './SrsRotation.js';

export type MosaicHintIntent = 'left' | 'right' | 'rotate-cw' | 'down';

export interface MosaicHint {
  /** Identifies the active piece for which this suggestion remains valid. */
  readonly pieceSerial: number;
  /** The first safe action; the runtime never applies it on behalf of the player. */
  readonly intent: MosaicHintIntent;
  /** The reachable landing the presentation may highlight. */
  readonly target: {
    readonly column: number;
    readonly row: number;
    readonly rotation: Rotation;
  };
}

interface SearchNode {
  readonly tetromino: ActiveTetromino;
  readonly actions: readonly MosaicHintIntent[];
}

interface Candidate {
  readonly node: SearchNode;
  readonly linesCleared: number;
  readonly holes: number;
  readonly aggregateHeight: number;
  readonly bumpiness: number;
}

// Prefer an actionable horizontal/rotation cue when equivalent paths reach the same landing.
const SEARCH_ACTIONS: readonly MosaicHintIntent[] = ['left', 'right', 'rotate-cw', 'down'];

/**
 * Finds the best landing reachable with the same actions available to the child.
 * It is deliberately advisory: no board, engine state or input is changed.
 */
export function requestMosaicHint(state: MosaicEngineState): MosaicHint | null {
  if (state.phase !== 'active' || state.active === null) return null;

  const queue: SearchNode[] = [{ tetromino: state.active, actions: [] }];
  const visited = new Set<string>([tetrominoKey(state.active)]);
  let cursor = 0;
  let best: Candidate | null = null;

  while (cursor < queue.length) {
    const node = queue[cursor];
    cursor += 1;
    if (node === undefined) throw new Error('Mosaic hint queue unexpectedly underflowed.');
    if (!fitsTetromino(state.board, { ...node.tetromino, row: node.tetromino.row + 1 })) {
      const candidate = evaluateLanding(state.board, node);
      if (best === null || isBetterCandidate(candidate, best)) best = candidate;
    }

    for (const action of SEARCH_ACTIONS) {
      const next = applyHintAction(state.board, node.tetromino, action);
      if (next === null) continue;
      const key = tetrominoKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ tetromino: next, actions: [...node.actions, action] });
    }
  }

  if (best === null || best.node.actions[0] === undefined) return null;
  return {
    pieceSerial: state.active.serial,
    intent: best.node.actions[0],
    target: {
      column: best.node.tetromino.column,
      row: best.node.tetromino.row,
      rotation: best.node.tetromino.rotation,
    },
  };
}

function applyHintAction(
  board: MosaicBoard,
  tetromino: ActiveTetromino,
  action: MosaicHintIntent,
): ActiveTetromino | null {
  if (action === 'rotate-cw') return tryRotateClockwise(board, tetromino);
  const candidate =
    action === 'left'
      ? { ...tetromino, column: tetromino.column - 1 }
      : action === 'right'
        ? { ...tetromino, column: tetromino.column + 1 }
        : { ...tetromino, row: tetromino.row + 1 };
  return fitsTetromino(board, candidate) ? candidate : null;
}

function evaluateLanding(board: MosaicBoard, node: SearchNode): Candidate {
  const locked = lockTetromino(board, node.tetromino);
  const completeRows = findCompleteRows(locked);
  const compacted = clearCompleteRows(locked, completeRows);
  const heights = columnHeights(compacted);
  return {
    node,
    linesCleared: completeRows.length,
    holes: countHoles(compacted),
    aggregateHeight: heights.reduce((sum, height) => sum + height, 0),
    bumpiness: heights
      .slice(1)
      .reduce((sum, height, index) => sum + Math.abs(height - (heights[index] ?? 0)), 0),
  };
}

function isBetterCandidate(candidate: Candidate, current: Candidate): boolean {
  if (candidate.linesCleared !== current.linesCleared)
    return candidate.linesCleared > current.linesCleared;
  if (candidate.holes !== current.holes) return candidate.holes < current.holes;
  if (candidate.aggregateHeight !== current.aggregateHeight)
    return candidate.aggregateHeight < current.aggregateHeight;
  if (candidate.bumpiness !== current.bumpiness) return candidate.bumpiness < current.bumpiness;
  return candidate.node.actions.length < current.node.actions.length;
}

function columnHeights(board: MosaicBoard): readonly number[] {
  const totalRows = board.bufferRows + board.visibleRows;
  return Array.from({ length: board.columns }, (_, column) => {
    for (let row = 0; row < totalRows; row += 1) {
      if (board.cells[row * board.columns + column] !== null) return totalRows - row;
    }
    return 0;
  });
}

function countHoles(board: MosaicBoard): number {
  const totalRows = board.bufferRows + board.visibleRows;
  let holes = 0;
  for (let column = 0; column < board.columns; column += 1) {
    let occupiedAbove = false;
    for (let row = 0; row < totalRows; row += 1) {
      if (board.cells[row * board.columns + column] !== null) occupiedAbove = true;
      else if (occupiedAbove) holes += 1;
    }
  }
  return holes;
}

function tetrominoKey(tetromino: ActiveTetromino): string {
  return `${tetromino.rotation}:${tetromino.column}:${tetromino.row}`;
}
