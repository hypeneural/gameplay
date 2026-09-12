import type { GameViewport } from '@christmas-games/platform';

export interface MemoryCardPlacement {
  readonly x: number;
  readonly y: number;
}

export interface MemoryBoardLayout {
  readonly cardHeight: number;
  readonly cardWidth: number;
  readonly columns: number;
  readonly headerY: number;
  readonly placements: readonly MemoryCardPlacement[];
  readonly rows: number;
}

const cardAspectRatio = 0.8;
const compactCardMinWidth = 88;
const tabletCardMinWidth = 104;
const minimumTouchTarget = 52;

interface CandidateLayout {
  readonly cardWidth: number;
  readonly columns: number;
  readonly gap: number;
  readonly rows: number;
}

function createCandidate(
  viewport: GameViewport,
  cardCount: number,
  columns: number,
  headerHeight: number,
  horizontalInset: number,
  gap: number,
): CandidateLayout {
  const rows = Math.ceil(cardCount / columns);
  const boardTop = viewport.safeTop + headerHeight;
  const boardBottom = viewport.height - viewport.safeBottom - 14;
  const maxWidth = (viewport.width - horizontalInset * 2 - gap * (columns - 1)) / columns;
  const maxHeight = (boardBottom - boardTop - gap * (rows - 1)) / rows;

  return {
    cardWidth: Math.min(maxWidth, maxHeight * cardAspectRatio),
    columns,
    gap,
    rows,
  };
}

function chooseColumns(
  viewport: GameViewport,
  cardCount: number,
  headerHeight: number,
  horizontalInset: number,
  gap: number,
): CandidateLayout {
  const candidates = [4, 3, 2].map((columns) =>
    createCandidate(viewport, cardCount, columns, headerHeight, horizontalInset, gap),
  );
  const tablet = candidates[0]!;
  if (tablet.cardWidth >= tabletCardMinWidth) return tablet;

  const compact = candidates[1]!;
  if (compact.cardWidth >= compactCardMinWidth) return compact;

  // On a short phone, forcing two columns creates four/six tiny rows. Prefer
  // the largest feasible cards once neither comfortable portrait preset fits.
  return candidates.reduce((best, candidate) =>
    candidate.cardWidth > best.cardWidth ? candidate : best,
  );
}

/** Plans an 8-card board without recreating its Game Objects on resize. */
export function planMemoryBoardLayout(
  viewport: GameViewport,
  cardCount: number,
): MemoryBoardLayout {
  const horizontalInset = Math.max(16, viewport.width * 0.06);
  const gap = Math.max(8, Math.min(12, viewport.width * 0.03));
  // The first row holds title and time. The commands sit on a truly separate
  // second row so the timer never overlaps the 52 px pause target.
  const headerHeight = Math.max(152, Math.min(168, viewport.contentHeight * 0.23));
  const candidate = chooseColumns(viewport, cardCount, headerHeight, horizontalInset, gap);
  const { columns, rows } = candidate;
  const boardTop = viewport.safeTop + headerHeight;
  const boardBottom = viewport.height - viewport.safeBottom - 14;
  const cardWidth = Math.max(minimumTouchTarget, candidate.cardWidth);
  const cardHeight = cardWidth / cardAspectRatio;
  const boardHeight = cardHeight * rows + gap * (rows - 1);
  const startY =
    boardTop + Math.max(0, (boardBottom - boardTop - boardHeight) / 2) + cardHeight / 2;
  const placements = Array.from({ length: cardCount }, (_, index) => {
    const row = Math.floor(index / columns);
    const indexInRow = index % columns;
    const cardsInRow = Math.min(columns, cardCount - row * columns);
    const rowWidth = cardWidth * cardsInRow + gap * (cardsInRow - 1);
    const rowStartX = (viewport.width - rowWidth) / 2 + cardWidth / 2;

    return {
      x: rowStartX + indexInRow * (cardWidth + gap),
      y: startY + row * (cardHeight + gap),
    };
  });

  return {
    cardHeight,
    cardWidth,
    columns,
    headerY: viewport.safeTop + 22,
    placements,
    rows,
  };
}
