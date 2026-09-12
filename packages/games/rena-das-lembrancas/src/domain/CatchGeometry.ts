/** Segment against a relative catch rectangle. Returns earliest contact fraction. */
export function sweptCatch(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  player0: number,
  player1: number,
  radius: number,
): number | undefined {
  let enter = 0;
  let leave = 1;
  for (const [start, end, low, high] of [
    [x0 - player0, x1 - player1, -radius, radius],
    [y0, y1, 0.97, 1.05],
  ]) {
    const delta = end! - start!;
    if (Math.abs(delta) < 1e-9) {
      if (start! < low! || start! > high!) return undefined;
    } else {
      const a = (low! - start!) / delta;
      const b = (high! - start!) / delta;
      enter = Math.max(enter, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
      if (enter > leave) return undefined;
    }
  }
  return enter;
}
