import type { QualityTier, SceneScope } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';
import type { MosaicRect } from '../MosaicExperienceLayout.js';

interface MosaicVfxLayout {
  readonly board: MosaicRect;
  readonly memoryFrame: MosaicRect;
}

interface MosaicVfxDirectorInput {
  readonly quality: QualityTier;
  readonly reducedMotion: boolean;
  readonly scene: PhaserModule.Scene;
  readonly scope: SceneScope;
  readonly snowSweepTextureKey: string;
  readonly sparkleTextureKey: string;
}

/**
 * Bounded visual accents. This intentionally uses a reusable pool instead of
 * an emitter: no effect allocates unbounded particles or derives a game move.
 */
export class MosaicVfxDirector {
  private readonly enabled: boolean;
  private readonly sparkles: PhaserModule.GameObjects.Image[] = [];
  private layoutState?: MosaicVfxLayout;
  private sparkleCursor = 0;
  private readonly snowSweep?: PhaserModule.GameObjects.Image;

  constructor(private readonly input: MosaicVfxDirectorInput) {
    this.enabled = input.quality !== 'LOW' && !input.reducedMotion;
    if (!this.enabled) return;
    if (input.scene.textures.exists(input.sparkleTextureKey)) {
      this.sparkles.push(
        ...Array.from({ length: 12 }, () =>
          input.scope.resource(
            input.scene.add.image(0, 0, input.sparkleTextureKey).setDepth(24).setVisible(false),
          ),
        ),
      );
    }
    if (input.scene.textures.exists(input.snowSweepTextureKey)) {
      this.snowSweep = input.scope.resource(
        input.scene.add.image(0, 0, input.snowSweepTextureKey).setDepth(23).setVisible(false),
      );
    }
    input.scope.add(() =>
      input.scene.tweens.killTweensOf(
        [...this.sparkles, this.snowSweep].filter(
          (target): target is PhaserModule.GameObjects.Image => target !== undefined,
        ),
      ),
    );
  }

  layout(layout: MosaicVfxLayout): void {
    this.layoutState = layout;
  }

  consume(effects: readonly MosaicExperienceEffect[]): void {
    const layout = this.layoutState;
    if (!this.enabled || layout === undefined) return;
    for (const effect of effects) {
      if (effect.type === 'piece-rotated') this.sparkle(layout.board, 1);
      else if (effect.type === 'piece-locked') this.sparkle(layout.board, 2, 0.74);
      else if (effect.type === 'lines-cleared') this.clearSparkles(layout.board, effect.rows);
      else if (effect.type === 'memory-frame-changed') this.sparkle(layout.memoryFrame, 4, 0.84);
      else if (effect.type === 'recovery-requested') this.sweep(layout.board);
      else if (effect.type === 'target-reached') this.sparkle(layout.board, 8, 1.15);
    }
  }

  private clearSparkles(board: MosaicRect, rows: readonly number[]): void {
    const cellHeight = board.height / 14;
    for (const row of rows.slice(0, 2)) {
      const y = board.y + (row - 4 + 0.5) * cellHeight;
      for (let step = 0; step < 4; step += 1)
        this.spawn(board.x + ((step + 0.5) / 4) * board.width, y, 0.9);
    }
  }

  private sparkle(bounds: MosaicRect, count: number, scale = 1): void {
    for (let index = 0; index < count; index += 1) {
      const fraction = (index + 1) / (count + 1);
      this.spawn(
        bounds.x + fraction * bounds.width,
        bounds.y + (0.3 + (index % 2) * 0.34) * bounds.height,
        scale,
      );
    }
  }

  private spawn(x: number, y: number, scale: number): void {
    const sparkle = this.sparkles[this.sparkleCursor++ % this.sparkles.length];
    if (sparkle === undefined) return;
    this.input.scene.tweens.killTweensOf(sparkle);
    sparkle
      .setPosition(x, y)
      .setScale(scale * 0.62)
      .setAlpha(0.92)
      .setVisible(true);
    this.input.scene.tweens.add({
      targets: sparkle,
      alpha: 0,
      scaleX: scale,
      scaleY: scale,
      y: y - 10,
      duration: 240,
      ease: 'Sine.Out',
      onComplete: () => sparkle.setVisible(false),
    });
  }

  private sweep(board: MosaicRect): void {
    const sweep = this.snowSweep;
    if (sweep === undefined) return;
    this.input.scene.tweens.killTweensOf(sweep);
    sweep
      .setPosition(board.x - board.width * 0.15, board.y + board.height * 0.5)
      .setDisplaySize(board.width * 1.2, Math.min(72, board.height * 0.15))
      .setAlpha(0.82)
      .setVisible(true);
    this.input.scene.tweens.add({
      targets: sweep,
      x: board.x + board.width * 1.15,
      alpha: 0,
      duration: 320,
      ease: 'Sine.InOut',
      onComplete: () => sweep.setVisible(false),
    });
  }
}
