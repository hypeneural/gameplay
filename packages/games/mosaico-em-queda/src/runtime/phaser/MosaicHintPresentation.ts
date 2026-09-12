import type { ActiveTetromino } from '../../domain/EngineTypes.js';
import type { MosaicHint } from '../../domain/MosaicHint.js';
import { tetrominoCells } from '../../domain/TetrominoStates.js';
import type { MosaicBoardPresentation } from './MosaicBoardPresentation.js';
import type { MosaicDockPresentation } from './MosaicDockPresentation.js';

/**
 * Renders an advisory route without becoming a second input source. The BFS
 * result is the source of truth: geometry only supplies the tetromino kind for
 * the matching active serial, and the presentation never advances that route.
 */
export class MosaicHintPresentation {
  private hintKey: string | null = null;

  constructor(
    private readonly board: MosaicBoardPresentation,
    private readonly dock: MosaicDockPresentation,
  ) {}

  present(hint: MosaicHint | null, active: ActiveTetromino | null): void {
    if (hint === null || active === null || hint.pieceSerial !== active.serial) {
      this.clear();
      return;
    }
    this.board.presentHintCells(
      tetrominoCells(active.kind, hint.target.rotation, hint.target.column, hint.target.row),
    );
    const key = `${hint.pieceSerial}:${hint.intent}:${hint.target.rotation}:${hint.target.column}:${hint.target.row}`;
    if (key === this.hintKey) return;
    this.hintKey = key;
    this.dock.setHint(hint.intent);
  }

  clear(): void {
    if (this.hintKey === null) return;
    this.hintKey = null;
    this.board.presentHintCells([]);
    this.dock.setHint(null);
  }
}
