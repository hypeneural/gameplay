import { createViewportLayout } from '@christmas-games/platform';
import type { GameViewport } from '@christmas-games/platform';

export interface MosaicViewportSource {
  readonly scaleHeight: number;
  readonly scaleWidth: number;
  readonly visualViewportHeight?: number;
  readonly visualViewportWidth?: number;
}

/** Uses the smaller confirmed browser viewport without altering engine coordinates. */
export function resolveMosaicViewport(source: MosaicViewportSource): GameViewport {
  const width = boundedViewportDimension(source.scaleWidth, source.visualViewportWidth);
  const height = boundedViewportDimension(source.scaleHeight, source.visualViewportHeight);
  return createViewportLayout(width, height);
}

function boundedViewportDimension(
  scaleDimension: number,
  visualViewportDimension?: number,
): number {
  if (!Number.isFinite(scaleDimension) || scaleDimension <= 0) {
    throw new Error('Scale dimensions must be positive and finite.');
  }
  if (
    visualViewportDimension === undefined ||
    !Number.isFinite(visualViewportDimension) ||
    visualViewportDimension <= 0
  ) {
    return scaleDimension;
  }
  return Math.min(scaleDimension, visualViewportDimension);
}
