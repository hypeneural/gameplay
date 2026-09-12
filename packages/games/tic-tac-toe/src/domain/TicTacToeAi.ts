import type { Random } from '@christmas-games/platform';
import { ticTacToeTuning } from '../tuning.js';
import { findImmediateTicTacToeWins, findTicTacToeForkMoves } from './TicTacToeAnalysis.js';
import {
  applyTicTacToeMove,
  findTicTacToeWinner,
  isTicTacToeDraw,
  legalTicTacToeMoves,
} from './TicTacToeRules.js';
import {
  otherTicTacToePlayer,
  type CellIndex,
  type PlayerId,
  type SantaDifficulty,
  type TicTacToeBoard,
} from './TicTacToeTypes.js';

const MASTER_MOVE_ORDER: readonly CellIndex[] = [4, 0, 2, 6, 8, 1, 3, 5, 7];
const CORNERS: readonly CellIndex[] = [0, 2, 6, 8];
const SIDES: readonly CellIndex[] = [1, 3, 5, 7];

export interface ChooseSantaMoveInput {
  readonly board: TicTacToeBoard;
  readonly difficulty: SantaDifficulty;
  readonly random: Random;
  readonly santa?: PlayerId;
}

/** Computes one legal move; it has no knowledge of Scene, timing, sound or haptic. */
export function chooseSantaTicTacToeMove({
  board,
  difficulty,
  random,
  santa = 'player-b',
}: ChooseSantaMoveInput): CellIndex | null {
  if (findTicTacToeWinner(board) !== null || isTicTacToeDraw(board)) return null;
  const legalMoves = legalTicTacToeMoves(board);
  if (legalMoves.length === 0) return null;

  switch (difficulty) {
    case 'easy':
      return chooseEasyMove(board, santa, legalMoves, random);
    case 'smart':
      return chooseSmartMove(board, santa, legalMoves, random);
    case 'master':
      return chooseMasterMove(board, santa, legalMoves, random);
  }
}

function chooseEasyMove(
  board: TicTacToeBoard,
  santa: PlayerId,
  legalMoves: readonly CellIndex[],
  random: Random,
): CellIndex {
  const opponent = otherTicTacToePlayer(santa);
  const wins = findImmediateTicTacToeWins(board, santa);
  if (wins.length > 0) return chooseCandidate(wins, random);
  const blocks = findImmediateTicTacToeWins(board, opponent);
  if (blocks.length > 0 && random.next() < ticTacToeTuning.easy.blockImmediateLossChance) {
    return chooseCandidate(blocks, random);
  }
  return chooseEasyPositionalMove(legalMoves, random);
}

function chooseEasyPositionalMove(legalMoves: readonly CellIndex[], random: Random): CellIndex {
  const weightFor = (cell: CellIndex): number => {
    if (cell === 4) return ticTacToeTuning.easy.positionalWeights.center;
    if (CORNERS.includes(cell)) return ticTacToeTuning.easy.positionalWeights.corner;
    return ticTacToeTuning.easy.positionalWeights.side;
  };
  let totalWeight = 0;
  for (const cell of legalMoves) totalWeight += weightFor(cell);
  let remaining = random.next() * totalWeight;
  for (const cell of legalMoves) {
    remaining -= weightFor(cell);
    if (remaining < 0) return cell;
  }
  return legalMoves[legalMoves.length - 1]!;
}

function chooseSmartMove(
  board: TicTacToeBoard,
  santa: PlayerId,
  legalMoves: readonly CellIndex[],
  random: Random,
): CellIndex {
  const opponent = otherTicTacToePlayer(santa);
  const wins = findImmediateTicTacToeWins(board, santa);
  if (wins.length > 0) return chooseCandidate(wins, random);

  const blocks = findImmediateTicTacToeWins(board, opponent);
  if (blocks.length > 0) return chooseCandidate(blocks, random);

  const ownForks = findTicTacToeForkMoves(board, santa);
  if (ownForks.length > 0) return chooseCandidate(ownForks, random);

  const opponentForks = findTicTacToeForkMoves(board, opponent);
  if (opponentForks.length > 0) {
    return chooseSmartForkDefenseMove(board, santa, opponent, opponentForks, legalMoves, random);
  }

  if (board[4] === null) return 4;

  const oppositeCorners = CORNERS.filter((corner) => {
    const oppositeCorner = (8 - corner) as CellIndex;
    return board[corner] === opponent && board[oppositeCorner] === null;
  });
  if (oppositeCorners.length > 0) {
    return chooseCandidate(
      oppositeCorners.map((corner) => (8 - corner) as CellIndex),
      random,
    );
  }

  const openCorners = CORNERS.filter((cell) => board[cell] === null);
  if (openCorners.length > 0) return chooseCandidate(openCorners, random);
  const openSides = SIDES.filter((cell) => board[cell] === null);
  return chooseCandidate(openSides.length > 0 ? openSides : legalMoves, random);
}

function chooseSmartForkDefenseMove(
  board: TicTacToeBoard,
  santa: PlayerId,
  opponent: PlayerId,
  opponentForks: readonly CellIndex[],
  legalMoves: readonly CellIndex[],
  random: Random,
): CellIndex {
  const candidates = legalMoves.map((cell) => {
    const afterMove = applyTicTacToeMove(board, santa, cell);
    return {
      cell,
      opponentForkCount: findTicTacToeForkMoves(afterMove, opponent).length,
      createsThreat: findImmediateTicTacToeWins(afterMove, santa).length > 0,
    };
  });
  const minimumForkCount = Math.min(...candidates.map((candidate) => candidate.opponentForkCount));
  const fewestForks = candidates.filter(
    (candidate) => candidate.opponentForkCount === minimumForkCount,
  );

  if (opponentForks.length === 1) {
    const directNeutralization = fewestForks.filter(
      (candidate) => candidate.cell === opponentForks[0],
    );
    if (directNeutralization.length > 0)
      return chooseCandidate(
        directNeutralization.map(({ cell }) => cell),
        random,
      );
  }

  const forcingThreats = fewestForks.filter((candidate) => candidate.createsThreat);
  if (forcingThreats.length > 0)
    return chooseCandidate(
      forcingThreats.map(({ cell }) => cell),
      random,
    );
  return chooseCandidate(
    fewestForks.map(({ cell }) => cell),
    random,
  );
}

function chooseMasterMove(
  board: TicTacToeBoard,
  santa: PlayerId,
  legalMoves: readonly CellIndex[],
  random: Random,
): CellIndex {
  const opponent = otherTicTacToePlayer(santa);
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestMoves: CellIndex[] = [];
  for (const move of orderedMoves(legalMoves)) {
    // A fresh alpha/beta window preserves exact root scores for every tie.
    const score = minimax(
      applyTicTacToeMove(board, santa, move),
      opponent,
      santa,
      opponent,
      1,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    );
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return chooseCandidate(bestMoves, random);
}

function minimax(
  board: TicTacToeBoard,
  turn: PlayerId,
  santa: PlayerId,
  opponent: PlayerId,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const winner = findTicTacToeWinner(board);
  if (winner === santa) return 100 - depth;
  if (winner === opponent) return -100 + depth;
  if (isTicTacToeDraw(board)) return 0;

  if (turn === santa) {
    let score = Number.NEGATIVE_INFINITY;
    let nextAlpha = alpha;
    for (const move of orderedMoves(legalTicTacToeMoves(board))) {
      score = Math.max(
        score,
        minimax(
          applyTicTacToeMove(board, santa, move),
          opponent,
          santa,
          opponent,
          depth + 1,
          nextAlpha,
          beta,
        ),
      );
      nextAlpha = Math.max(nextAlpha, score);
      if (nextAlpha >= beta) break;
    }
    return score;
  }

  let score = Number.POSITIVE_INFINITY;
  let nextBeta = beta;
  for (const move of orderedMoves(legalTicTacToeMoves(board))) {
    score = Math.min(
      score,
      minimax(
        applyTicTacToeMove(board, opponent, move),
        santa,
        santa,
        opponent,
        depth + 1,
        alpha,
        nextBeta,
      ),
    );
    nextBeta = Math.min(nextBeta, score);
    if (alpha >= nextBeta) break;
  }
  return score;
}

function orderedMoves(legalMoves: readonly CellIndex[]): readonly CellIndex[] {
  const legal = new Set(legalMoves);
  return MASTER_MOVE_ORDER.filter((cell) => legal.has(cell));
}

function chooseCandidate(candidates: readonly CellIndex[], random: Random): CellIndex {
  return candidates[random.int(0, candidates.length - 1)]!;
}
