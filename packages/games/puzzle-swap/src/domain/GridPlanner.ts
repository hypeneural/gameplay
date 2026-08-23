export interface PuzzleGridCandidate {
  readonly columns: number;
  readonly rows: number;
}

export interface PuzzleGridPlannerInput {
  /** Display-normalized source aspect ratio (width / height). */
  readonly photoAspectRatio: number;
  /** The padding-free stage available to the puzzle board. */
  readonly availableWidth: number;
  readonly availableHeight: number;
  /** A product decision, not a hard-coded square board assumption. */
  readonly preferredPieceCount: number;
  readonly minimumCellSizeCssPx: number;
  /** An optional product-curated set, e.g. 3×4, 4×5 and 5×7 for portraits. */
  readonly candidates?: readonly PuzzleGridCandidate[];
}

export interface PuzzleGridPlan {
  readonly columns: number;
  readonly rows: number;
  readonly pieceCount: number;
  /** A contain-fitted photo board; no person is cropped or distorted. */
  readonly boardWidth: number;
  readonly boardHeight: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly meetsMinimumCellSize: boolean;
}

const defaultGridCandidates: readonly PuzzleGridCandidate[] = createDefaultCandidates();

/**
 * Chooses a rectangular grid deterministically. The photo always occupies a
 * proportional contain rectangle; only the number of cells changes.
 */
export function planPuzzleGrid(input: PuzzleGridPlannerInput): PuzzleGridPlan {
  assertPlannerInput(input);

  const board = containPhoto(input.photoAspectRatio, input.availableWidth, input.availableHeight);
  const candidates = input.candidates ?? defaultGridCandidates;
  if (candidates.length === 0) {
    throw new Error('Puzzle grid planner needs at least one candidate.');
  }

  let bestPlan: PuzzleGridPlan | null = null;
  for (const candidate of candidates) {
    assertGridCandidate(candidate);
    const plan = createPlan(board.width, board.height, candidate, input.minimumCellSizeCssPx);

    if (bestPlan === null || comparePlans(plan, bestPlan, input) < 0) {
      bestPlan = plan;
    }
  }

  if (bestPlan === null) {
    throw new Error('Puzzle grid planner could not create a grid.');
  }

  return bestPlan;
}

function containPhoto(
  photoAspectRatio: number,
  availableWidth: number,
  availableHeight: number,
): { width: number; height: number } {
  const availableAspectRatio = availableWidth / availableHeight;
  if (photoAspectRatio > availableAspectRatio) {
    return { width: availableWidth, height: availableWidth / photoAspectRatio };
  }

  return { width: availableHeight * photoAspectRatio, height: availableHeight };
}

function createPlan(
  boardWidth: number,
  boardHeight: number,
  candidate: PuzzleGridCandidate,
  minimumCellSizeCssPx: number,
): PuzzleGridPlan {
  const cellWidth = boardWidth / candidate.columns;
  const cellHeight = boardHeight / candidate.rows;

  return {
    columns: candidate.columns,
    rows: candidate.rows,
    pieceCount: candidate.columns * candidate.rows,
    boardWidth,
    boardHeight,
    cellWidth,
    cellHeight,
    meetsMinimumCellSize: cellWidth >= minimumCellSizeCssPx && cellHeight >= minimumCellSizeCssPx,
  };
}

function comparePlans(
  candidate: PuzzleGridPlan,
  current: PuzzleGridPlan,
  input: PuzzleGridPlannerInput,
): number {
  const candidateUsability = candidate.meetsMinimumCellSize ? 0 : 1;
  const currentUsability = current.meetsMinimumCellSize ? 0 : 1;
  if (candidateUsability !== currentUsability) {
    return candidateUsability - currentUsability;
  }

  const candidatePieceDistance = Math.abs(candidate.pieceCount - input.preferredPieceCount);
  const currentPieceDistance = Math.abs(current.pieceCount - input.preferredPieceCount);
  if (candidatePieceDistance !== currentPieceDistance) {
    return candidatePieceDistance - currentPieceDistance;
  }

  const candidateOrientationPenalty = orientationPenalty(candidate, input.photoAspectRatio);
  const currentOrientationPenalty = orientationPenalty(current, input.photoAspectRatio);
  if (candidateOrientationPenalty !== currentOrientationPenalty) {
    return candidateOrientationPenalty - currentOrientationPenalty;
  }

  const candidateMinimumCell = Math.min(candidate.cellWidth, candidate.cellHeight);
  const currentMinimumCell = Math.min(current.cellWidth, current.cellHeight);
  if (candidateMinimumCell !== currentMinimumCell) {
    return currentMinimumCell - candidateMinimumCell;
  }

  if (candidate.columns !== current.columns) {
    return candidate.columns - current.columns;
  }

  return candidate.rows - current.rows;
}

function orientationPenalty(plan: PuzzleGridPlan, photoAspectRatio: number): number {
  if (photoAspectRatio < 1) {
    return plan.columns > plan.rows ? 1 : 0;
  }
  if (photoAspectRatio > 1) {
    return plan.columns < plan.rows ? 1 : 0;
  }
  return 0;
}

function createDefaultCandidates(): readonly PuzzleGridCandidate[] {
  const candidates: PuzzleGridCandidate[] = [];
  for (let columns = 2; columns <= 8; columns += 1) {
    for (let rows = 2; rows <= 8; rows += 1) {
      candidates.push({ columns, rows });
    }
  }
  return candidates;
}

function assertPlannerInput(input: PuzzleGridPlannerInput): void {
  const positiveValues = [
    input.photoAspectRatio,
    input.availableWidth,
    input.availableHeight,
    input.minimumCellSizeCssPx,
  ];
  if (positiveValues.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error('Puzzle grid planner dimensions must be positive finite values.');
  }
  if (!Number.isInteger(input.preferredPieceCount) || input.preferredPieceCount < 2) {
    throw new Error('Puzzle preferred piece count must be an integer of at least two.');
  }
}

function assertGridCandidate(candidate: PuzzleGridCandidate): void {
  if (
    !Number.isInteger(candidate.columns) ||
    !Number.isInteger(candidate.rows) ||
    candidate.columns < 1 ||
    candidate.rows < 1 ||
    candidate.columns * candidate.rows < 2
  ) {
    throw new Error('Puzzle grid candidates need at least two positive integer cells.');
  }
}
