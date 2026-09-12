import type { GameViewport } from '@christmas-games/platform';
import type { MosaicDockAction } from './phaser/MosaicDockInput.js';

export interface MosaicRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface MosaicExperienceLayout {
  readonly board: MosaicRect;
  readonly controls: Readonly<Record<MosaicDockAction, MosaicRect>>;
  readonly hint: MosaicRect;
  readonly memoryFrame: MosaicRect;
  readonly next: MosaicRect;
  readonly progress: MosaicRect;
  readonly portrait: boolean;
}

const BOARD_ASPECT_RATIO = 8 / 14;
const PRIMARY_TARGET_SIZE = 52;
const SECONDARY_TARGET_SIZE = 44;
const PANEL_GAP = 10;

function rect(x: number, y: number, width: number, height: number): MosaicRect {
  return { x, y, width, height };
}

/**
 * Gives the photo frame, board and primary actions their own protected areas.
 * This is deliberately pure: Phaser only consumes the rectangles and never
 * chooses a second layout policy during resize or orientation changes.
 */
export function planMosaicExperienceLayout(viewport: GameViewport): MosaicExperienceLayout {
  const portrait = viewport.height >= viewport.width;
  return portrait ? planPortrait(viewport) : planLandscape(viewport);
}

function planPortrait(viewport: GameViewport): MosaicExperienceLayout {
  const inset = Math.max(14, Math.round(viewport.width * 0.04));
  const contentWidth = viewport.width - inset * 2;
  const frameSize = Math.min(60, Math.max(SECONDARY_TARGET_SIZE, Math.round(contentWidth * 0.16)));
  const nextSize = SECONDARY_TARGET_SIZE;
  // The small captions sit beneath the frame and the next-piece preview.
  const headerHeight = Math.max(frameSize, nextSize) + 18;
  const controlsTop = viewport.height - viewport.safeBottom - PRIMARY_TARGET_SIZE * 2 - PANEL_GAP;
  const controls = portraitControls(viewport.width / 2, controlsTop, contentWidth);
  const hintHeight = 30;
  const boardTop = viewport.safeTop + headerHeight + hintHeight + PANEL_GAP * 2;
  const boardHeightBudget = Math.max(0, controlsTop - PANEL_GAP - boardTop);
  const boardWidth = Math.max(
    1,
    Math.min(contentWidth, boardHeightBudget * BOARD_ASPECT_RATIO, 360),
  );
  const boardHeight = boardWidth / BOARD_ASPECT_RATIO;
  const board = rect((viewport.width - boardWidth) / 2, boardTop, boardWidth, boardHeight);
  const progressLeft = inset + frameSize + PANEL_GAP;
  const progressRight = viewport.width - inset - nextSize - PANEL_GAP;

  return {
    portrait: true,
    board,
    controls,
    hint: rect(inset, viewport.safeTop + headerHeight + 2, contentWidth, hintHeight),
    memoryFrame: rect(inset, viewport.safeTop, frameSize, frameSize),
    next: rect(viewport.width - inset - nextSize, viewport.safeTop, nextSize, nextSize),
    progress: rect(
      progressLeft,
      viewport.safeTop,
      Math.max(1, progressRight - progressLeft),
      headerHeight,
    ),
  };
}

function portraitControls(
  centerX: number,
  top: number,
  availableWidth: number,
): Readonly<Record<MosaicDockAction, MosaicRect>> {
  const gap = Math.max(10, Math.min(18, (availableWidth - PRIMARY_TARGET_SIZE * 3) / 4));
  const rowWidth = PRIMARY_TARGET_SIZE * 3 + gap * 2;
  const startX = centerX - rowWidth / 2;
  return {
    left: rect(startX, top, PRIMARY_TARGET_SIZE, PRIMARY_TARGET_SIZE),
    'rotate-cw': rect(
      startX + PRIMARY_TARGET_SIZE + gap,
      top,
      PRIMARY_TARGET_SIZE,
      PRIMARY_TARGET_SIZE,
    ),
    right: rect(
      startX + (PRIMARY_TARGET_SIZE + gap) * 2,
      top,
      PRIMARY_TARGET_SIZE,
      PRIMARY_TARGET_SIZE,
    ),
    down: rect(
      centerX - PRIMARY_TARGET_SIZE / 2,
      top + PRIMARY_TARGET_SIZE + PANEL_GAP,
      PRIMARY_TARGET_SIZE,
      PRIMARY_TARGET_SIZE,
    ),
  };
}

function planLandscape(viewport: GameViewport): MosaicExperienceLayout {
  const inset = Math.max(14, Math.round(viewport.height * 0.035));
  const boardHeight = Math.max(1, viewport.contentHeight - inset * 2);
  const boardWidth = boardHeight * BOARD_ASPECT_RATIO;
  const board = rect(inset, viewport.safeTop + inset, boardWidth, boardHeight);
  const sidebarLeft = board.x + board.width + PANEL_GAP;
  const sidebarWidth = Math.max(1, viewport.width - sidebarLeft - inset);
  const frameSize = Math.min(64, Math.max(SECONDARY_TARGET_SIZE, Math.round(sidebarWidth * 0.34)));
  const progressLeft = sidebarLeft + frameSize + PANEL_GAP;
  const controlsTop = viewport.height - viewport.safeBottom - PRIMARY_TARGET_SIZE * 2 - PANEL_GAP;
  const controls = landscapeControls(sidebarLeft, controlsTop, sidebarWidth);

  return {
    portrait: false,
    board,
    controls,
    hint: rect(sidebarLeft, viewport.safeTop + frameSize + PANEL_GAP + 10, sidebarWidth, 42),
    memoryFrame: rect(sidebarLeft, viewport.safeTop + inset, frameSize, frameSize),
    next: rect(
      sidebarLeft + Math.max(0, sidebarWidth - SECONDARY_TARGET_SIZE),
      viewport.safeTop + inset,
      SECONDARY_TARGET_SIZE,
      SECONDARY_TARGET_SIZE,
    ),
    progress: rect(
      progressLeft,
      viewport.safeTop + inset,
      Math.max(1, sidebarLeft + sidebarWidth - SECONDARY_TARGET_SIZE - PANEL_GAP - progressLeft),
      frameSize,
    ),
  };
}

function landscapeControls(
  left: number,
  top: number,
  width: number,
): Readonly<Record<MosaicDockAction, MosaicRect>> {
  const gap = Math.max(8, Math.min(14, (width - PRIMARY_TARGET_SIZE * 2) / 3));
  const rowWidth = PRIMARY_TARGET_SIZE * 2 + gap;
  const startX = left + Math.max(0, (width - rowWidth) / 2);
  return {
    left: rect(startX, top, PRIMARY_TARGET_SIZE, PRIMARY_TARGET_SIZE),
    'rotate-cw': rect(
      startX + PRIMARY_TARGET_SIZE + gap,
      top,
      PRIMARY_TARGET_SIZE,
      PRIMARY_TARGET_SIZE,
    ),
    right: rect(
      startX,
      top + PRIMARY_TARGET_SIZE + PANEL_GAP,
      PRIMARY_TARGET_SIZE,
      PRIMARY_TARGET_SIZE,
    ),
    down: rect(
      startX + PRIMARY_TARGET_SIZE + gap,
      top + PRIMARY_TARGET_SIZE + PANEL_GAP,
      PRIMARY_TARGET_SIZE,
      PRIMARY_TARGET_SIZE,
    ),
  };
}
