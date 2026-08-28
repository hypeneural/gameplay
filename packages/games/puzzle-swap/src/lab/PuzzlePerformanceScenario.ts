import { SeededRandom, createViewportLayout } from '@christmas-games/platform';
import {
  createSolvedPuzzleBoard,
  isPuzzleSolved,
  swapPuzzlePieces,
  type PuzzleBoard,
  type PuzzleSwap,
} from '../domain/PuzzleBoard.js';
import { findPuzzleHintSwap } from '../domain/PuzzleHint.js';
import { shufflePuzzleBoard } from '../domain/PuzzleShuffle.js';
import { selectPuzzleTopology } from '../domain/PuzzleTopology.js';
import { puzzleSwapTuning } from '../tuning.js';
import {
  planPuzzleBoardLayout,
  puzzleSwapChromeMetrics,
} from '../runtime/phaser/PuzzleBoardLayout.js';

export type PuzzlePerformanceScenario =
  'idle' | 'selection' | 'hint' | 'correct' | 'victory' | 'pause' | 'restart' | 'exit';

export interface PuzzleScenarioTap {
  readonly x: number;
  readonly y: number;
}

export interface PuzzlePerformanceScenarioPlan {
  readonly action: 'observe' | 'restart' | 'exit';
  readonly description: string;
  readonly scenario: PuzzlePerformanceScenario;
  readonly tapSpacingMs: number;
  readonly tapSequence: readonly PuzzleScenarioTap[];
}

export interface PuzzlePerformanceScenarioInput {
  readonly height: number;
  readonly photoAspectRatio: number;
  readonly runSeed: number;
  readonly scenario: PuzzlePerformanceScenario;
  readonly width: number;
}

/**
 * Replays visible game actions from the exact board seed without exposing a
 * Scene, a real photo, a session token or an implementation-only board state
 * to React. This module is pure so its route can prove each scenario first.
 */
export function planPuzzlePerformanceScenario(
  input: PuzzlePerformanceScenarioInput,
): PuzzlePerformanceScenarioPlan {
  const board = createShuffledBoard(input.photoAspectRatio, input.runSeed);
  const layout = planLayout(input, board);
  const cellTap = (cellIndex: number): PuzzleScenarioTap => cellCenter(layout, cellIndex);

  switch (input.scenario) {
    case 'idle':
      return observe(input.scenario, 'Observa a partida sem tocar, para medir o repouso.');
    case 'selection': {
      const cellIndex = firstIncorrectCell(board);
      return tapPlan(input.scenario, 'Escolhe uma peça fora do lugar.', [cellTap(cellIndex)]);
    }
    case 'hint':
      return tapPlan(input.scenario, 'Pede uma dica que mostra duas peças relacionadas.', [
        { x: input.width - 78, y: puzzleSwapChromeMetrics.controlOffsetCssPx },
      ]);
    case 'correct': {
      const hint = findPuzzleHintSwap(board);
      if (!hint) throw new Error('A performance scenario needs an unsolved board.');
      return tapPlan(input.scenario, 'Troca a dupla indicada e encaixa uma peça.', [
        cellTap(hint.targetCellIndex),
        cellTap(hint.sourceCellIndex),
      ]);
    }
    case 'victory':
      return tapPlan(
        input.scenario,
        'Monta a foto com a sequência determinística completa.',
        solveSwaps(board).flatMap((swap) => [cellTap(swap.firstIndex), cellTap(swap.secondIndex)]),
        // A victory is a sequence of real two-touch swaps. Reserve enough
        // room for each visible piece tween to finish before the next pair;
        // compressing this turns the lab into an input race instead of a
        // reproducible player action.
        460,
      );
    case 'pause':
      return tapPlan(input.scenario, 'Abre a pausa com o controle real do jogo.', [
        { x: input.width - 28, y: puzzleSwapChromeMetrics.controlOffsetCssPx },
      ]);
    case 'restart':
      return {
        action: 'restart',
        description: 'Desmonta e monta outra partida com a mesma combinação.',
        scenario: input.scenario,
        tapSpacingMs: 0,
        tapSequence: [],
      };
    case 'exit':
      return {
        action: 'exit',
        description: 'Desmonta a partida e verifica a superfície vazia.',
        scenario: input.scenario,
        tapSpacingMs: 0,
        tapSequence: [],
      };
  }
}

function createShuffledBoard(photoAspectRatio: number, runSeed: number): PuzzleBoard {
  const topology = selectPuzzleTopology(photoAspectRatio);
  return shufflePuzzleBoard(
    createSolvedPuzzleBoard(topology.columns, topology.rows),
    new SeededRandom(runSeed),
  );
}

function planLayout(input: PuzzlePerformanceScenarioInput, board: PuzzleBoard) {
  return planPuzzleBoardLayout({
    viewport: createViewportLayout(input.width, input.height),
    photoAspectRatio: input.photoAspectRatio,
    columns: board.columns,
    rows: board.rows,
    preferredPieceCount: board.pieces.length,
    minimumCellSizeCssPx: puzzleSwapTuning.minimumCellSizeCssPx,
    boardInsetCssPx: puzzleSwapTuning.boardInsetCssPx,
  });
}

function cellCenter(layout: ReturnType<typeof planLayout>, cellIndex: number): PuzzleScenarioTap {
  const column = cellIndex % layout.plan.columns;
  const row = Math.floor(cellIndex / layout.plan.columns);
  return {
    x: layout.x + (column + 0.5) * layout.plan.cellWidth,
    y: layout.y + (row + 0.5) * layout.plan.cellHeight,
  };
}

function firstIncorrectCell(board: PuzzleBoard): number {
  const cellIndex = board.pieces.findIndex((pieceId, index) => pieceId !== index);
  if (cellIndex < 0) throw new Error('A performance scenario needs an unsolved board.');
  return cellIndex;
}

function solveSwaps(board: PuzzleBoard): readonly PuzzleSwap[] {
  let current = board;
  const swaps: PuzzleSwap[] = [];
  for (let targetCellIndex = 0; targetCellIndex < current.pieces.length; targetCellIndex += 1) {
    if (current.pieces[targetCellIndex] === targetCellIndex) continue;
    const sourceCellIndex = current.pieces.indexOf(targetCellIndex);
    if (sourceCellIndex < 0) throw new Error('Puzzle board lost a required piece.');
    const swap = { firstIndex: targetCellIndex, secondIndex: sourceCellIndex };
    current = swapPuzzlePieces(current, swap);
    swaps.push(swap);
  }
  if (!isPuzzleSolved(current))
    throw new Error('Performance victory sequence must solve the board.');
  return swaps;
}

function observe(
  scenario: PuzzlePerformanceScenario,
  description: string,
): PuzzlePerformanceScenarioPlan {
  return { action: 'observe', description, scenario, tapSpacingMs: 0, tapSequence: [] };
}

function tapPlan(
  scenario: PuzzlePerformanceScenario,
  description: string,
  tapSequence: readonly PuzzleScenarioTap[],
  tapSpacingMs = 320,
): PuzzlePerformanceScenarioPlan {
  return { action: 'observe', description, scenario, tapSpacingMs, tapSequence };
}
