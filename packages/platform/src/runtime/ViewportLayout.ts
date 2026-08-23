export interface GameViewport {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  contentWidth: number;
  contentHeight: number;
}

export function createViewportLayout(width: number, height: number): GameViewport {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Viewport dimensions must be positive finite values.');
  }

  const safeTop = Math.max(16, Math.round(height * 0.025));
  const safeBottom = Math.max(20, Math.round(height * 0.035));

  return {
    width,
    height,
    safeTop,
    safeBottom,
    contentWidth: width,
    contentHeight: height - safeTop - safeBottom,
  };
}
