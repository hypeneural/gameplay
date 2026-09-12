import type * as Phaser from 'phaser';
import type { QualityTier } from '@christmas-games/platform';
import type { PhotoLayoutManager } from '../PhotoLayoutManager.js';
import { artKey } from './ProceduralArt.js';
import { visualKey } from './visualAssets.js';

/** Fixed layers and bounded snowfall, animated with the paused game clock. */
export class WinterEnvironment {
  private readonly background: Phaser.GameObjects.Image;
  private readonly canopy: Phaser.GameObjects.Image;
  private readonly flakes: Phaser.GameObjects.Graphics;
  private readonly foreground: Phaser.GameObjects.Graphics;
  private readonly mist: Phaser.GameObjects.Image[];
  private readonly powder: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastTouchAt = -1000;
  private gustAt = -10000;
  private lastFrame = -1;

  constructor(
    scene: Phaser.Scene,
    private readonly quality: QualityTier,
    private readonly reduced: boolean,
  ) {
    this.background = scene.add
      .image(0, 0, visualKey('winter-night-v2'))
      .setOrigin(0.5)
      .setDepth(-9);
    this.canopy = scene.add.image(0, 0, visualKey('snow-edge-v2')).setOrigin(0.5, 0).setDepth(12);
    this.flakes = scene.add.graphics().setDepth(3);
    this.foreground = scene.add.graphics().setDepth(12);
    this.mist = [-1, 1].map(() => scene.add.image(0, 0, artKey('mist')).setDepth(2).setAlpha(0.2));
    this.powder = scene.add
      .particles(0, 0, artKey('powder'), {
        emitting: false,
        lifespan: { min: 600, max: 1300 },
        speedX: { min: -48, max: 48 },
        speedY: { min: 15, max: 65 },
        gravityY: 85,
        scale: { start: 0.32, end: 0.1 },
        alpha: { start: 0.9, end: 0 },
        maxParticles: 40,
        maxAliveParticles: 40,
        reserve: 40,
      })
      .setDepth(13);
  }

  layout(l: PhotoLayoutManager): void {
    const frame = this.background.frame;
    this.background
      .setPosition(l.width / 2, l.height / 2)
      .setScale(Math.max(l.width / frame.width, l.height / frame.height));
    const capHeight = Math.min(145, l.width / 3);
    this.canopy.setPosition(l.width / 2, -capHeight * 0.13).setDisplaySize(l.width, capHeight);
    this.mist.forEach((image, i) =>
      image.setPosition(i ? l.width : 0, l.height * 0.78).setDisplaySize(l.width * 1.3, 150),
    );
    this.lastFrame = -1;
  }

  update(now: number, l: PhotoLayoutManager, frozen: boolean, hero: boolean): void {
    if (this.quality === 'LOW' || this.reduced) return;
    const frame = Math.floor(now / 33);
    if (frame === this.lastFrame) return;
    this.lastFrame = frame;
    const gust = Math.max(0, 1 - (now - this.gustAt) / 1800);
    const count = this.quality === 'HIGH' ? 86 : 58;
    this.flakes.clear();
    this.foreground.clear();
    for (let i = 0; i < count; i++) {
      const depth = ((i % 5) + 1) / 5;
      const speed = 13 + depth * 26 + (frozen ? 8 : 0);
      const y = ((i * 137.51 + (now / 1000) * speed) % (l.height + 30)) - 15;
      const x =
        ((i * 83.19 +
          Math.sin(now / 2400 + i) * (12 + depth * 20) +
          (now / 1000) * (5 + depth * 7) +
          gust * 45 +
          l.width) %
          (l.width + 24)) -
        12;
      const r = 0.65 + depth * 1.8;
      this.flakes.fillStyle(0xe8f6ff, 0.17 + depth * 0.43).fillCircle(x, y, r);
      if (!hero && i % 8 === 0 && (x < 15 || x > l.width - 15)) {
        this.foreground.fillStyle(0xe8f7ff, 0.1).fillCircle(x, y, r * 3.3);
        this.foreground.fillStyle(0xffffff, 0.27).fillCircle(x, y, r * 1.4);
      }
    }
    this.mist.forEach((image, i) =>
      image
        .setX((i ? l.width : 0) + Math.sin(now / 4100 + i * 2) * 24)
        .setAlpha(hero ? 0.09 : frozen ? 0.32 : 0.18),
    );
  }

  touch(x: number, y: number, now: number, l: PhotoLayoutManager): boolean {
    const edge = y < 49 || y > l.height - 24 || x < 13 || x > l.width - 13;
    if (!edge || now - this.lastTouchAt < 480) return false;
    this.lastTouchAt = now;
    this.gustAt = now;
    this.powder.explode(this.reduced ? 2 : this.quality === 'LOW' ? 5 : 22, x, y);
    return true;
  }

  setPaused(paused: boolean): void {
    if (paused) this.powder.pause();
    else this.powder.resume();
  }
}
