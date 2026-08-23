import type { Rect } from './PhotoSurface.js';

export interface TouchTargetOptions {
  minSize?: number;
  padding?: number;
}

/** Expands a child-facing primary control into a stable, finger-friendly hit area. */
export function createTouchHitArea(bounds: Rect, options: TouchTargetOptions = {}): Rect {
  const minSize = options.minSize ?? 52;
  const padding = options.padding ?? 8;
  if (minSize <= 0 || padding < 0) throw new Error('Touch target dimensions must be valid.');
  const width = Math.max(bounds.width + padding * 2, minSize);
  const height = Math.max(bounds.height + padding * 2, minSize);
  return {
    x: bounds.x - (width - bounds.width) / 2,
    y: bounds.y - (height - bounds.height) / 2,
    width,
    height,
  };
}
