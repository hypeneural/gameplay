import type { SceneScope } from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';
import type { MosaicRect } from '../MosaicExperienceLayout.js';

export interface MosaicRecoveryPresentationInput {
  readonly reducedMotion: boolean;
  readonly scene: PhaserModule.Scene;
  readonly scope: SceneScope;
}

/**
 * Holds presentation input while the already-determined Workshop sweep plays.
 * It exposes time only; the Scene remains the one authorized to call the
 * deterministic relief transition after this finite acknowledgement.
 */
export class MosaicRecoveryPresentation {
  private active = false;
  private readonly message: PhaserModule.GameObjects.Text;
  private readyAt = 0;

  constructor(private readonly input: MosaicRecoveryPresentationInput) {
    this.message = input.scope.resource(
      input.scene.add
        .text(0, 0, 'Vamos abrir espaço!', {
          align: 'center',
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(25)
        .setVisible(false),
    );
    input.scope.add(() => input.scene.tweens.killTweensOf(this.message));
  }

  consume(effects: readonly MosaicExperienceEffect[]): void {
    if (effects.some((effect) => effect.type === 'recovery-requested')) this.begin();
    if (effects.some((effect) => effect.type === 'rows-relieved')) this.complete();
  }

  layout(board: MosaicRect): void {
    this.message.setPosition(board.x + board.width / 2, board.y + board.height / 2);
  }

  get readyToApply(): boolean {
    return this.active && this.input.scene.time.now >= this.readyAt;
  }

  private begin(): void {
    this.active = true;
    this.readyAt = this.input.scene.time.now + (this.input.reducedMotion ? 0 : 360);
    this.message.setAlpha(this.input.reducedMotion ? 1 : 0).setVisible(true);
    if (!this.input.reducedMotion) {
      this.input.scene.tweens.killTweensOf(this.message);
      this.input.scene.tweens.add({
        targets: this.message,
        alpha: 1,
        duration: 100,
        ease: 'Sine.Out',
      });
    }
  }

  private complete(): void {
    this.active = false;
    this.message.setVisible(false).setAlpha(1);
  }
}
