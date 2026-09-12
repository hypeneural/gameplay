/**
 * Geometria visual pura do cartão de Memórias. Ela permite que o runtime e os
 * testes concordem sobre a moldura sem misturar decisão de arte com Phaser.
 */
export interface MemoryCardMaterial {
  readonly backInset: number;
  readonly backInnerHeight: number;
  readonly backInnerWidth: number;
  readonly backLabelFontSize: number;
  readonly backLabelY: number;
  readonly backRibbonHeight: number;
  readonly backRibbonY: number;
  readonly backSealDiameter: number;
  readonly backSealY: number;
  readonly backStarFontSize: number;
  readonly frameInset: number;
  readonly frameStrokeWidth: number;
  readonly matchMarkFontSize: number;
  readonly matchMarkInset: number;
  readonly shadowOffset: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function rounded(value: number): number {
  return Math.round(value);
}

/**
 * Plans the physical layers of one card at any responsive board size.
 *
 * The front keeps a single, contained photo inside an ivory passe-partout.
 * The back is deliberately constructed from simple material layers so it
 * stays readable in LOW without another texture or browser download.
 */
export function planMemoryCardMaterial(width: number, height: number): MemoryCardMaterial {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Memory card material requires a positive finite size');
  }

  const frameInset = clamp(rounded(width * 0.072), 5, 14);
  const backInset = clamp(rounded(width * 0.1), 7, 18);
  const backInnerWidth = Math.max(1, width - backInset * 2);
  const backInnerHeight = Math.max(1, height - backInset * 2);
  const backRibbonHeight = clamp(rounded(height * 0.13), 15, 30);
  const backSealDiameter = clamp(rounded(Math.min(backInnerWidth, backInnerHeight) * 0.5), 34, 58);
  const backSealY = -rounded(height * 0.045);
  const backLabelFontSize = clamp(rounded(width * 0.105), 9, 14);

  return {
    backInset,
    backInnerHeight,
    backInnerWidth,
    backLabelFontSize,
    backLabelY: backSealY + backSealDiameter / 2 + backLabelFontSize * 0.9,
    backRibbonHeight,
    backRibbonY: -height * 0.18,
    backSealDiameter,
    backSealY,
    backStarFontSize: clamp(rounded(backSealDiameter * 0.58), 20, 34),
    frameInset,
    frameStrokeWidth: width >= 104 ? 3 : 2,
    matchMarkFontSize: clamp(rounded(width * 0.2), 16, 28),
    matchMarkInset: clamp(rounded(width * 0.13), 12, 20),
    shadowOffset: clamp(rounded(height * 0.035), 3, 7),
  };
}
