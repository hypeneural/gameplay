import { describe, expect, it, vi, type Mock } from 'vitest';
import { attachCrystalControl } from '../src/phaser/CrystalControl.js';

class Emitter {
  private readonly listeners = new Map<string, Set<(...args: never[]) => void>>();
  on(event: string, fn: (...args: never[]) => void): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(fn);
    this.listeners.set(event, set);
  }
  off(event: string, fn: (...args: never[]) => void): void {
    this.listeners.get(event)?.delete(fn);
  }
  emit(event: string): void {
    this.listeners.get(event)?.forEach((fn) => fn());
  }
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

function fixture(reducedMotion = false) {
  const methods = [
    'clear',
    'fillStyle',
    'lineStyle',
    'fillRoundedRect',
    'strokeRoundedRect',
    'fillRect',
    'fillCircle',
    'beginPath',
    'moveTo',
    'lineTo',
    'strokePath',
    'setPosition',
    'setRotation',
    'setVisible',
    'setAlpha',
    'destroy',
  ] as const;
  const graphics = Object.fromEntries(methods.map((key) => [key, vi.fn()])) as Record<
    (typeof methods)[number],
    Mock<(...args: unknown[]) => void>
  >;
  const target = Object.assign(new Emitter(), {
    x: 80,
    y: 60,
    displayWidth: 52,
    displayHeight: 52,
    originX: 0.5,
    originY: 0.5,
    rotation: 0,
    depth: 0,
    visible: true,
    alpha: 1,
  });
  const events = new Emitter();
  const cleanups: Array<() => void> = [];
  attachCrystalControl({
    graphics,
    target,
    events,
    scope: {
      add: (cleanup) => {
        cleanups.push(cleanup);
      },
    },
    reducedMotion,
    icon: 'sound',
  });
  return { graphics, target, events, dispose: () => cleanups.forEach((fn) => fn()) };
}

describe('crystal control lifecycle', () => {
  it('releases a replaced menu button before the scene is destroyed', () => {
    const f = fixture();
    f.target.emit('pointerdown');
    f.events.emit('postupdate');
    expect(f.events.listenerCount('postupdate')).toBe(1);
    f.target.emit('destroy');
    expect(f.events.listenerCount('postupdate')).toBe(0);
    expect(f.target.listenerCount('pointerdown')).toBe(0);
    f.dispose();
    expect(f.graphics.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps the hit area still, settles feedback and reflows in reduced motion', () => {
    const f = fixture(true);
    f.target.emit('pointerdown');
    f.events.emit('postupdate');
    expect(f.graphics.setPosition).toHaveBeenLastCalledWith(80, 60);
    expect(f.target.x).toBe(80);
    f.target.displayWidth = 80;
    f.events.emit('postupdate');
    expect(f.graphics.fillRoundedRect).toHaveBeenCalledWith(-40, -26, 80, 52, 15);
    f.dispose();
  });
});
