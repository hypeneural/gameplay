import { createPhotoSurface } from '@christmas-games/platform';
import type { SceneScope } from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';
import type { MosaicRect } from '../MosaicExperienceLayout.js';
import { mosaicPhotoTextureKey, type MosaicRuntimePhotoPlan } from '../MosaicRuntimePhotoPlan.js';

export interface MosaicVictoryPresentationInput {
  readonly photos: MosaicRuntimePhotoPlan;
  readonly reducedMotion: boolean;
  readonly ribbonTextureKey: string;
  readonly scene: PhaserModule.Scene;
  readonly scope: SceneScope;
}

/** Finite, photo-first completion surface. Tween callbacks never mutate game state. */
export class MosaicVictoryPresentation {
  private bounds: MosaicRect | undefined;
  private readonly heroBorder: PhaserModule.GameObjects.Rectangle;
  private readonly heroImage: PhaserModule.GameObjects.Image;
  private readonly heroLabel: PhaserModule.GameObjects.Text;
  private readonly heroMatte: PhaserModule.GameObjects.Rectangle;
  private pendingCelebration = false;
  private readonly ribbon: PhaserModule.GameObjects.Image | undefined;
  private readonly shade: PhaserModule.GameObjects.Rectangle;
  private shown = false;

  constructor(private readonly input: MosaicVictoryPresentationInput) {
    const anchorGame = mosaicPhotoTextureKey(
      input.photos,
      input.photos.selection.anchorPhotoId,
      'game',
    );
    this.shade = input.scope.resource(
      input.scene.add
        .rectangle(0, 0, 1, 1, 0x071b18, 0)
        .setOrigin(0.5)
        .setDepth(17)
        .setVisible(false),
    );
    this.heroMatte = input.scope.resource(
      input.scene.add
        .rectangle(0, 0, 1, 1, 0xf8dfa0, 0.98)
        .setOrigin(0.5)
        .setDepth(18)
        .setVisible(false),
    );
    this.heroImage = input.scope.resource(
      input.scene.add.image(0, 0, anchorGame).setOrigin(0.5).setDepth(18.1).setVisible(false),
    );
    this.heroBorder = input.scope.resource(
      input.scene.add
        .rectangle(0, 0, 1, 1, 0x103e35, 0)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0x8f1d35, 1)
        .setDepth(18.2)
        .setVisible(false),
    );
    this.ribbon = input.scene.textures.exists(input.ribbonTextureKey)
      ? input.scope.resource(
          input.scene.add
            .image(0, 0, input.ribbonTextureKey)
            .setOrigin(0.5)
            .setDepth(18.25)
            .setVisible(false),
        )
      : undefined;
    this.heroLabel = input.scope.resource(
      input.scene.add
        .text(0, 0, 'SUA LEMBRANÇA ESTÁ PRONTA', {
          align: 'center',
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(18.3)
        .setVisible(false),
    );
    input.scope.add(() =>
      input.scene.tweens.killTweensOf(
        [
          this.shade,
          this.heroMatte,
          this.heroImage,
          this.heroBorder,
          this.ribbon,
          this.heroLabel,
        ].filter(
          (
            target,
          ): target is
            | PhaserModule.GameObjects.Rectangle
            | PhaserModule.GameObjects.Image
            | PhaserModule.GameObjects.Text => target !== undefined,
        ),
      ),
    );
  }

  consume(effects: readonly MosaicExperienceEffect[]): void {
    if (effects.some((effect) => effect.type === 'target-reached')) this.pendingCelebration = true;
  }

  layout(bounds: MosaicRect): void {
    this.bounds = bounds;
    const inset = Math.max(8, Math.min(16, bounds.width * 0.04));
    const hero = {
      x: bounds.x + inset,
      y: bounds.y + inset,
      width: Math.max(1, bounds.width - inset * 2),
      height: Math.max(1, bounds.height - inset * 2),
    };
    this.shade
      .setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      .setSize(bounds.width, bounds.height);
    this.heroMatte
      .setPosition(hero.x + hero.width / 2, hero.y + hero.height / 2)
      .setSize(hero.width, hero.height);
    this.heroBorder
      .setPosition(hero.x + hero.width / 2, hero.y + hero.height / 2)
      .setSize(hero.width, hero.height);
    this.ribbon
      ?.setPosition(hero.x + hero.width / 2, hero.y + hero.height - 30)
      .setDisplaySize(hero.width * 0.9, Math.min(50, hero.height * 0.18));
    this.heroLabel
      .setPosition(hero.x + hero.width / 2, hero.y + hero.height - 20)
      .setWordWrapWidth(hero.width - 24, true);
    const anchor = this.input.photos.photosById.get(this.input.photos.selection.anchorPhotoId);
    if (anchor === undefined) return;
    const surface = createPhotoSurface(anchor, hero, 'contain');
    this.heroImage
      .setPosition(
        surface.photo.x + surface.photo.width / 2,
        surface.photo.y + surface.photo.height / 2,
      )
      .setDisplaySize(surface.photo.width, surface.photo.height);
  }

  present(terminal: boolean): void {
    if (!terminal || this.shown || this.bounds === undefined) return;
    this.shown = true;
    const objects = [
      this.shade,
      this.heroMatte,
      this.heroImage,
      this.heroBorder,
      this.ribbon,
      this.heroLabel,
    ].filter(
      (
        target,
      ): target is
        | PhaserModule.GameObjects.Rectangle
        | PhaserModule.GameObjects.Image
        | PhaserModule.GameObjects.Text => target !== undefined,
    );
    objects.forEach((object) => object.setVisible(true));
    if (this.input.reducedMotion || !this.pendingCelebration) {
      this.shade.setAlpha(0.62);
      this.heroMatte.setAlpha(1);
      this.heroImage.setAlpha(1);
      this.heroBorder.setAlpha(1).setScale(1);
      this.ribbon?.setAlpha(1);
      this.heroLabel.setAlpha(1);
      return;
    }
    this.shade.setAlpha(0);
    this.heroMatte.setAlpha(0);
    this.heroImage.setAlpha(0);
    this.heroBorder.setAlpha(0).setScale(0.96);
    this.ribbon?.setAlpha(0);
    this.heroLabel.setAlpha(0);
    this.input.scene.tweens.add({
      targets: this.shade,
      alpha: 0.62,
      duration: 180,
      ease: 'Sine.Out',
    });
    this.input.scene.tweens.add({
      targets: [this.heroMatte, this.heroBorder],
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 360,
      delay: 80,
      ease: 'Sine.Out',
    });
    this.input.scene.tweens.add({
      targets: this.heroImage,
      alpha: 1,
      duration: 300,
      delay: 80,
      ease: 'Sine.Out',
    });
    this.input.scene.tweens.add({
      targets: [this.ribbon, this.heroLabel].filter(
        (target): target is PhaserModule.GameObjects.Image | PhaserModule.GameObjects.Text =>
          target !== undefined,
      ),
      alpha: 1,
      duration: 180,
      delay: 440,
      ease: 'Sine.Out',
    });
  }
}
