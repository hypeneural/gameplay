import type * as Phaser from 'phaser';
import type { MagicPhotoStateMachine } from '../../domain/MagicPhotoStateMachine.js';
import type { PhotoLayoutManager } from '../PhotoLayoutManager.js';
import { artKey } from './ProceduralArt.js';

export class HintManager {
  private requestedId: number | undefined;
  private requestedUntil = 0;
  private readonly hand: Phaser.GameObjects.Image;
  private readonly sparkle: Phaser.GameObjects.Image;
  constructor(
    scene: Phaser.Scene,
    private readonly reduced: boolean,
  ) {
    this.hand = scene.add
      .image(0, 0, artKey('hand'))
      .setDisplaySize(32, 40)
      .setDepth(14)
      .setVisible(false);
    this.sparkle = scene.add
      .image(0, 0, artKey('spark'))
      .setDisplaySize(18, 18)
      .setDepth(13)
      .setVisible(false);
  }

  update(
    model: MagicPhotoStateMachine,
    layout: PhotoLayoutManager,
    touching: boolean,
    tapAlternative: boolean,
  ): void {
    this.hand.setVisible(false);
    this.sparkle.setVisible(false);
    const phase = this.reduced ? 0.5 : (model.elapsedMs % 1800) / 1800;
    const requested = model.hotspots.find(
      (point) => point.id === this.requestedId && !point.discovered,
    );
    if (model.state === 'MAGIC_HUNT' && requested && model.elapsedMs < this.requestedUntil) {
      const point = layout.toWorld(requested);
      this.sparkle
        .setVisible(true)
        .setPosition(point.x, point.y)
        .setAlpha(1)
        .setDisplaySize(
          this.reduced ? 27 : 24 + Math.sin(phase * Math.PI) * 8,
          this.reduced ? 27 : 24 + Math.sin(phase * Math.PI) * 8,
        );
      this.hand
        .setVisible(!touching)
        .setAlpha(1)
        .setPosition(point.x + 10, point.y + 27 - (this.reduced ? 0 : phase * 10));
      return;
    }
    if (model.state === 'GIFT_READY' || model.state === 'RIBBON_DRAG') {
      const y = layout.gift.y - 146 * layout.gift.scale;
      this.hand
        .setVisible(!touching)
        .setPosition(
          layout.gift.x + 9,
          y - (tapAlternative ? layout.gift.pullDistance : phase * 55),
        );
      this.sparkle.setVisible(true).setPosition(layout.gift.x, y - layout.gift.pullDistance);
    } else if (['INTRO', 'GIFT_IDLE'].includes(model.state)) {
      this.hand
        .setVisible(true)
        .setPosition(layout.gift.x + 80 * layout.gift.scale, layout.gift.y + 45 * layout.gift.scale)
        .setAlpha(0.8);
    } else if (
      model.state === 'MAGIC_HUNT' &&
      model.huntIdleMs >= (model.found === 0 ? 1500 : 3000)
    ) {
      const target = model.hotspots.find((point) => !point.discovered);
      if (!target) return;
      const point = layout.toWorld(target);
      this.sparkle
        .setVisible(true)
        .setPosition(point.x, point.y)
        .setAlpha(this.reduced ? 0.8 : 0.3 + phase * 0.7);
      if (model.huntIdleMs >= 8000)
        this.hand
          .setVisible(true)
          .setAlpha(0.9)
          .setPosition(point.x + 10, point.y + 24 - phase * 18);
      this.sparkle.setScale(
        model.huntIdleMs >= 11000 ? 0.85 : model.huntIdleMs >= 5000 ? 0.65 : 0.45,
      );
    } else if (
      ((model.acceptsIce && model.ice.progress === 0) || model.state === 'MAGIC_INTRO') &&
      !touching &&
      model.stateElapsedMs < 2200
    ) {
      const point = layout.toWorld({ x: 0.2 + phase * 0.5, y: 0.82 });
      this.hand.setVisible(true).setPosition(point.x, point.y);
    }
  }
  hide(): void {
    this.hand.setVisible(false);
    this.sparkle.setVisible(false);
  }
  request(id: number, now: number): void {
    this.requestedId = id;
    this.requestedUntil = now + 2600;
  }
}
