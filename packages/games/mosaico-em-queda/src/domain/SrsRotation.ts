import type { ActiveTetromino, GridPoint, Rotation } from './EngineTypes.js';
import { fitsTetromino } from './MosaicBoard.js';
import type { MosaicBoard } from './EngineTypes.js';

type RotationTransition = '0>1' | '1>0' | '1>2' | '2>1' | '2>3' | '3>2' | '3>0' | '0>3';

const JLSTZ_KICKS: Readonly<Record<RotationTransition, readonly GridPoint[]>> = {
  '0>1': [
    { column: 0, row: 0 },
    { column: -1, row: 0 },
    { column: -1, row: -1 },
    { column: 0, row: 2 },
    { column: -1, row: 2 },
  ],
  '1>0': [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: 1, row: 1 },
    { column: 0, row: -2 },
    { column: 1, row: -2 },
  ],
  '1>2': [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: 1, row: 1 },
    { column: 0, row: -2 },
    { column: 1, row: -2 },
  ],
  '2>1': [
    { column: 0, row: 0 },
    { column: -1, row: 0 },
    { column: -1, row: -1 },
    { column: 0, row: 2 },
    { column: -1, row: 2 },
  ],
  '2>3': [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: 1, row: -1 },
    { column: 0, row: 2 },
    { column: 1, row: 2 },
  ],
  '3>2': [
    { column: 0, row: 0 },
    { column: -1, row: 0 },
    { column: -1, row: 1 },
    { column: 0, row: -2 },
    { column: -1, row: -2 },
  ],
  '3>0': [
    { column: 0, row: 0 },
    { column: -1, row: 0 },
    { column: -1, row: 1 },
    { column: 0, row: -2 },
    { column: -1, row: -2 },
  ],
  '0>3': [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: 1, row: -1 },
    { column: 0, row: 2 },
    { column: 1, row: 2 },
  ],
};

const I_KICKS: Readonly<Record<RotationTransition, readonly GridPoint[]>> = {
  '0>1': [
    { column: 0, row: 0 },
    { column: -2, row: 0 },
    { column: 1, row: 0 },
    { column: -2, row: 1 },
    { column: 1, row: -2 },
  ],
  '1>0': [
    { column: 0, row: 0 },
    { column: 2, row: 0 },
    { column: -1, row: 0 },
    { column: 2, row: 1 },
    { column: -1, row: -2 },
  ],
  '1>2': [
    { column: 0, row: 0 },
    { column: -1, row: 0 },
    { column: 2, row: 0 },
    { column: -1, row: -2 },
    { column: 2, row: 1 },
  ],
  '2>1': [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: -2, row: 0 },
    { column: 1, row: 2 },
    { column: -2, row: -1 },
  ],
  '2>3': [
    { column: 0, row: 0 },
    { column: 2, row: 0 },
    { column: -1, row: 0 },
    { column: 2, row: -1 },
    { column: -1, row: 2 },
  ],
  '3>2': [
    { column: 0, row: 0 },
    { column: -2, row: 0 },
    { column: 1, row: 0 },
    { column: -2, row: 1 },
    { column: 1, row: -2 },
  ],
  '3>0': [
    { column: 0, row: 0 },
    { column: 1, row: 0 },
    { column: -2, row: 0 },
    { column: 1, row: 2 },
    { column: -2, row: -1 },
  ],
  '0>3': [
    { column: 0, row: 0 },
    { column: -1, row: 0 },
    { column: 2, row: 0 },
    { column: -1, row: -2 },
    { column: 2, row: 1 },
  ],
};

export function tryRotateClockwise(
  board: MosaicBoard,
  tetromino: ActiveTetromino,
): ActiveTetromino | null {
  const rotation = nextRotation(tetromino.rotation);
  if (tetromino.kind === 'O') return { ...tetromino, rotation };

  const transition = `${tetromino.rotation}>${rotation}` as RotationTransition;
  const kicks = tetromino.kind === 'I' ? I_KICKS[transition] : JLSTZ_KICKS[transition];
  for (const kick of kicks) {
    const candidate: ActiveTetromino = {
      ...tetromino,
      rotation,
      column: tetromino.column + kick.column,
      row: tetromino.row + kick.row,
    };
    if (fitsTetromino(board, candidate)) return candidate;
  }
  return null;
}

function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 1) % 4) as Rotation;
}
