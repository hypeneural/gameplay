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

const cardAspectRatio = 0.74;

/** Plans an 8-card board without recreating its Game Objects on resize. */
export function planMemoryBoardLayout(
  viewport: GameViewport,
  cardCount: number,
): MemoryBoardLayout {
  const landscape = viewport.width > viewport.height;
  const columns = landscape ? 4 : 2;
  const rows = Math.ceil(cardCount / columns);
  const horizontalInset = Math.max(16, viewport.width * 0.06);
  const gap = Math.max(10, Math.min(18, viewport.width * 0.035));
  const headerHeight = Math.max(92, Math.min(122, viewport.contentHeight * 0.2));
  const boardTop = viewport.safeTop + headerHeight;
  const boardBottom = viewport.height - viewport.safeBottom - 14;
  const maxWidth = (viewport.width - horizontalInset * 2 - gap * (columns - 1)) / columns;
  const maxHeight = (boardBottom - boardTop - gap * (rows - 1)) / rows;
  const cardWidth = Math.max(52, Math.min(maxWidth, maxHeight * cardAspectRatio));
  const cardHeight = cardWidth / cardAspectRatio;
  const boardWidth = cardWidth * columns + gap * (columns - 1);
  const boardHeight = cardHeight * rows + gap * (rows - 1);
  const startX = (viewport.width - boardWidth) / 2 + cardWidth / 2;
  const startY =
    boardTop + Math.max(0, (boardBottom - boardTop - boardHeight) / 2) + cardHeight / 2;
  const placements = Array.from({ length: cardCount }, (_, index) => ({
    x: startX + (index % columns) * (cardWidth + gap),
    y: startY + Math.floor(index / columns) * (cardHeight + gap),
  }));

  return {
    cardHeight,
    cardWidth,
    columns,
    headerY: viewport.safeTop + 22,
    placements,
    rows,
  };
}
