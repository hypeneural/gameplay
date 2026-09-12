export type CrystalIcon =
  | 'play'
  | 'pause'
  | 'sound'
  | 'muted'
  | 'hint'
  | 'back'
  | 'close'
  | 'left'
  | 'right'
  | 'down'
  | 'rotate';

interface Emitter {
  on(event: string, listener: (...args: never[]) => void): unknown;
  off(event: string, listener: (...args: never[]) => void): unknown;
}
interface Scope {
  add(cleanup: () => void): void;
}
interface CrystalTarget extends Emitter {
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  originX: number;
  originY: number;
  rotation: number;
  depth: number;
  visible: boolean;
  alpha: number;
  setRounded?(radius: number): unknown;
  setFillStyle?(color: number, alpha?: number): unknown;
  setStrokeStyle?(width: number, color: number, alpha?: number): unknown;
}
export interface CrystalGraphics {
  destroy(): void;
  clear(): unknown;
  fillStyle(color: number, alpha?: number): unknown;
  lineStyle(width: number, color: number, alpha?: number): unknown;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius: number): unknown;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius: number): unknown;
  fillRect(x: number, y: number, width: number, height: number): unknown;
  fillCircle(x: number, y: number, radius: number): unknown;
  beginPath(): unknown;
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  strokePath(): unknown;
  setPosition(x: number, y: number): unknown;
  setRotation(value: number): unknown;
  setVisible(value: boolean): unknown;
  setAlpha(value: number): unknown;
}
interface CrystalLabel {
  setPosition(x: number, y: number): unknown;
  setFontSize(size: number): unknown;
  setShadow(
    x: number,
    y: number,
    color: string,
    blur: number,
    stroke: boolean,
    fill: boolean,
  ): unknown;
}
interface CrystalControlInput {
  graphics: CrystalGraphics;
  target: CrystalTarget;
  gesture?: Emitter;
  events: Emitter;
  scope: Scope;
  icon?: CrystalIcon | (() => CrystalIcon);
  iconSize?: number;
  label?: CrystalLabel;
  labelLayout?: 'below' | 'inline';
  ruby?: boolean;
  reducedMotion: boolean;
  /** Large cards retain their title, detail and original layout. */
  panel?: boolean;
}

/** A visual skin only: the game remains the sole owner of input, rules and sound. */
export function attachCrystalControl(input: CrystalControlInput): void {
  const { target, graphics, scope } = input;
  target.setRounded?.(14);
  target.setFillStyle?.(0, 0);
  target.setStrokeStyle?.(0, 0, 0);
  input.label?.setShadow(0, 1, '#092b25', 1, false, true);
  let energy = 0;
  let last = '';
  let disposed = false;
  const press = (): void => {
    energy = 1;
  };
  const release = (): void => {
    energy = Math.min(energy, 0.75);
  };
  const update = (_time?: number, delta = 16.67): void => {
    if (disposed) return;
    graphics.setVisible(target.visible);
    if (!target.visible) {
      energy = 0;
      last = '';
      return;
    }
    energy = Math.max(0, energy - Math.min(40, delta) / 260);
    const icon = typeof input.icon === 'function' ? input.icon() : input.icon;
    const width = Math.max(1, target.displayWidth);
    const height = Math.max(1, target.displayHeight);
    if (width < 12 || height < 12) {
      graphics.clear();
      return;
    }
    const x = target.x + (0.5 - target.originX) * width;
    const y = target.y + (0.5 - target.originY) * height;
    const pressure = input.reducedMotion ? 0 : energy;
    graphics.setPosition(x, y + pressure * 2);
    graphics.setRotation(target.rotation);
    graphics.setAlpha(target.alpha);
    if (input.label && icon) {
      const inline = input.labelLayout === 'inline';
      input.label.setPosition(
        x + (inline ? 14 : 0),
        y + (inline ? 0 : height * 0.27) + pressure * 2,
      );
      input.label.setFontSize(inline ? Math.min(16, height * 0.32) : Math.min(11, height * 0.2));
    }
    const state = `${width}:${height}:${Math.round(energy * 12)}:${icon}`;
    if (state === last) return;
    last = state;
    graphics.clear();
    drawCrystalFace(graphics, width, height, input.ruby ?? false, energy, input.panel ?? false);
    if (icon)
      drawCrystalIcon(
        graphics,
        icon,
        input.labelLayout === 'inline' ? -width / 2 + 24 : 0,
        input.label && input.labelLayout !== 'inline' ? -height * 0.13 : 0,
        Math.min(input.iconSize ?? 25, height * 0.48) * (1 + pressure * 0.08),
      );
  };
  const gesture = input.gesture ?? target;
  gesture.on('pointerdown', press);
  gesture.on('pointerup', release);
  gesture.on('pointerout', release);
  input.events.on('postupdate', update);
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    input.events.off('postupdate', update);
    gesture.off('pointerdown', press);
    gesture.off('pointerup', release);
    gesture.off('pointerout', release);
    target.off('destroy', dispose);
    graphics.destroy();
  };
  target.on('destroy', dispose);
  scope.add(dispose);
  update();
}

/** A pause card follows the existing scrim and keeps the game's input ownership. */
export function attachCrystalPause(input: {
  graphics: CrystalGraphics;
  backdrop: CrystalTarget;
  events: Emitter;
  scope: Scope;
}): void {
  let last = '';
  const update = (): void => {
    const { graphics: g, backdrop } = input;
    g.setVisible(backdrop.visible);
    if (!backdrop.visible) return;
    const width = Math.min(320, backdrop.displayWidth - 32);
    const height = Math.min(238, backdrop.displayHeight - 24);
    if (width < 80 || height < 120) return;
    g.setPosition(backdrop.displayWidth / 2, backdrop.displayHeight / 2);
    const state = `${width}:${height}`;
    if (state === last) return;
    last = state;
    g.clear();
    drawCrystalFace(g, width, height, false, 0, true);
    const buttonY = height / 2 - 39;
    // A single play medallion points to the existing tap-to-resume action.
    g.fillStyle(0x071f1c, 1);
    g.fillRoundedRect(-30, buttonY - 23, 60, 49, 15);
    g.fillStyle(0x9b3450, 1);
    g.fillRoundedRect(-30, buttonY - 26, 60, 48, 15);
    g.lineStyle(1.5, 0xffe6ac, 0.9);
    g.strokeRoundedRect(-30, buttonY - 26, 60, 48, 15);
    g.fillStyle(0xffffff, 0.16);
    g.fillRoundedRect(-25, buttonY - 23, 50, 13, 8);
    drawCrystalIcon(g, 'play', 0, buttonY - 2, 27);
    drawCrystalIcon(g, 'hint', -width / 2 + 25, -height / 2 + 26, 18);
    drawCrystalIcon(g, 'hint', width / 2 - 25, -height / 2 + 26, 18);
  };
  input.events.on('postupdate', update);
  input.scope.add(() => input.events.off('postupdate', update));
  update();
}

function mix(a: number, b: number, amount: number): number {
  const channel = (shift: number): number =>
    Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Banded, rounded material works in Canvas and WebGL without a mask or filter. */
export function drawCrystalFace(
  g: CrystalGraphics,
  width: number,
  height: number,
  ruby = false,
  pressure = 0,
  panel = false,
): void {
  const x = -width / 2;
  const y = -height / 2;
  const radius = Math.min(panel ? 22 : 15, height * 0.32, width * 0.24);
  const edge = ruby ? 0x4e192c : 0x061e1c;
  const top = ruby ? 0xc57d87 : 0x719b8e;
  const base = ruby ? 0x86223f : 0x173f38;
  g.fillStyle(0x001612, 0.25);
  g.fillRoundedRect(x - 1, y + 7, width + 2, height, radius + 1);
  g.fillStyle(edge, 1);
  g.fillRoundedRect(x, y + 4 - pressure * 2, width, height, radius);
  g.fillStyle(base, 1);
  g.fillRoundedRect(x, y, width, height, radius);
  const bands = 64;
  for (let i = 0; i < bands; i++) {
    const t = (i + 0.5) / bands;
    const rowY = t * height;
    const curve =
      rowY < radius ? radius - rowY : rowY > height - radius ? rowY - (height - radius) : 0;
    const inset = curve > 0 ? radius - Math.sqrt(Math.max(0, radius * radius - curve * curve)) : 0;
    const highlight = Math.max(0, 1 - t * 2.1) * 0.75 + pressure * 0.08;
    g.fillStyle(mix(base, top, Math.min(1, highlight)), 1);
    g.fillRect(x + inset, y + (i * height) / bands, width - inset * 2, height / bands + 0.3);
  }
  g.lineStyle(1.2, 0xf3e4b8, 0.8);
  g.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, radius);
  g.lineStyle(1, 0xf2fff6, 0.22);
  g.strokeRoundedRect(x + 3, y + 3, width - 6, height - 7, Math.max(2, radius - 3));
  g.fillStyle(0xffffff, 0.15 + pressure * 0.1);
  g.fillRoundedRect(x + 5, y + 3, width - 10, Math.min(height * 0.27, 25), Math.max(2, radius - 4));
  g.lineStyle(1.2, 0xfcfff0, 0.68);
  g.beginPath();
  g.moveTo(x + radius, y + 2);
  g.lineTo(x + width - radius, y + 2);
  g.strokePath();
}

export function drawCrystalIcon(
  g: CrystalGraphics,
  icon: CrystalIcon,
  x: number,
  y: number,
  size: number,
): void {
  const line = (points: number[][], color = 0xffe9ad, width = 2): void => {
    g.lineStyle(width, color, 1);
    g.beginPath();
    points.forEach(([px, py], index) => {
      const dx = x + ((px! - 16) * size) / 32;
      const dy = y + ((py! - 16) * size) / 32;
      if (index === 0) g.moveTo(dx, dy);
      else g.lineTo(dx, dy);
    });
    g.strokePath();
  };
  if (icon === 'play')
    line(
      [
        [11, 7],
        [25, 16],
        [11, 25],
        [11, 7],
      ],
      0xffedb7,
      2.5,
    );
  if (icon === 'pause') {
    line(
      [
        [11, 7],
        [11, 25],
      ],
      0xffedb7,
      3.5,
    );
    line(
      [
        [21, 7],
        [21, 25],
      ],
      0xffedb7,
      3.5,
    );
  }
  if (icon === 'back' || icon === 'left') {
    line([
      [19, 7],
      [9, 16],
      [19, 25],
    ]);
    line([
      [10, 16],
      [27, 16],
    ]);
  }
  if (icon === 'right') {
    line([
      [13, 7],
      [23, 16],
      [13, 25],
    ]);
    line([
      [22, 16],
      [5, 16],
    ]);
  }
  if (icon === 'down') {
    line([
      [7, 14],
      [16, 23],
      [25, 14],
    ]);
    line([
      [16, 22],
      [16, 5],
    ]);
  }
  if (icon === 'close') {
    line([
      [8, 8],
      [24, 24],
    ]);
    line([
      [24, 8],
      [8, 24],
    ]);
  }
  if (icon === 'sound' || icon === 'muted') {
    line([
      [5, 12],
      [10, 12],
      [17, 6],
      [17, 26],
      [10, 20],
      [5, 20],
      [5, 12],
    ]);
    if (icon === 'sound') {
      line([
        [21, 11],
        [23, 14],
        [23, 18],
        [21, 21],
      ]);
      line(
        [
          [25, 7],
          [28, 12],
          [28, 20],
          [25, 25],
        ],
        0xfff4c7,
        1.5,
      );
    } else {
      line([
        [22, 12],
        [29, 20],
      ]);
      line([
        [29, 12],
        [22, 20],
      ]);
    }
  }
  if (icon === 'hint') {
    line([
      [16, 3],
      [20, 12],
      [29, 16],
      [20, 20],
      [16, 29],
      [12, 20],
      [3, 16],
      [12, 12],
      [16, 3],
    ]);
    line(
      [
        [25, 3],
        [25, 8],
      ],
      0xffffff,
      1,
    );
    line(
      [
        [22.5, 5.5],
        [27.5, 5.5],
      ],
      0xffffff,
      1,
    );
  }
  if (icon === 'rotate') {
    line([
      [25, 12],
      [21, 7],
      [14, 6],
      [8, 11],
      [7, 18],
      [12, 24],
      [21, 24],
      [25, 20],
    ]);
    line([
      [25, 5],
      [25, 12],
      [18, 12],
    ]);
  }
}
