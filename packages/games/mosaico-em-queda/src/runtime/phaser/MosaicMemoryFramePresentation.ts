import { createPhotoSurface } from '@christmas-games/platform';
import type { SceneScope } from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';
import type { MosaicMemoryFrameSlot } from '../../domain/MosaicMemoryFrame.js';
import type { MosaicResolvedFramePhoto } from '../../domain/MosaicPhotoAvailability.js';
import type { MosaicRect } from '../MosaicExperienceLayout.js';
import { mosaicPhotoTextureKey, type MosaicRuntimePhotoPlan } from '../MosaicRuntimePhotoPlan.js';

const GOLD = 0xf8dfa0;
const PINE = 0x103e35;
const RED = 0x8f1d35;

export interface MosaicMemoryFramePresentationInput {
  readonly frameTextureKey: string;
  readonly photos: MosaicRuntimePhotoPlan;
  readonly reducedMotion: boolean;
  readonly scene: PhaserModule.Scene;
  readonly scope: SceneScope;
  readonly warmLightTextureKey: string;
}

/** A photo-first frame with a fixed two-image crossfade pool. */
export class MosaicMemoryFramePresentation {
  private activeTextureKey: string | undefined;
  private readonly art: PhaserModule.GameObjects.Image | undefined;
  private bounds: MosaicRect | undefined;
  private readonly currentImage: PhaserModule.GameObjects.Image;
  private readonly frameBorder: PhaserModule.GameObjects.Rectangle;
  private readonly frameLabel: PhaserModule.GameObjects.Text;
  private readonly frameMatte: PhaserModule.GameObjects.Rectangle;
  private initialized = false;
  private pendingReveal = false;
  private readonly previousImage: PhaserModule.GameObjects.Image;
  private readonly warmLight: PhaserModule.GameObjects.Image | PhaserModule.GameObjects.Rectangle;

  constructor(private readonly input: MosaicMemoryFramePresentationInput) {
    const anchorGame = mosaicPhotoTextureKey(
      input.photos,
      input.photos.selection.anchorPhotoId,
      'game',
    );
    this.frameMatte = input.scope.resource(
      input.scene.add.rectangle(0, 0, 1, 1, GOLD, 0.96).setOrigin(0.5).setDepth(6),
    );
    this.previousImage = this.image(anchorGame, 6.08).setVisible(false);
    this.currentImage = this.image(anchorGame, 6.1);
    this.frameBorder = input.scope.resource(
      input.scene.add
        .rectangle(0, 0, 1, 1, PINE, 0)
        .setOrigin(0.5)
        .setStrokeStyle(3, RED, 1)
        .setDepth(6.2),
    );
    this.art = input.scene.textures.exists(input.frameTextureKey)
      ? input.scope.resource(
          input.scene.add.image(0, 0, input.frameTextureKey).setOrigin(0.5).setDepth(6.25),
        )
      : undefined;
    this.warmLight = input.scene.textures.exists(input.warmLightTextureKey)
      ? input.scope.resource(
          input.scene.add
            .image(0, 0, input.warmLightTextureKey)
            .setOrigin(0.5)
            .setDepth(6.26)
            .setAlpha(0),
        )
      : input.scope.resource(
          input.scene.add.rectangle(0, 0, 1, 1, GOLD, 0).setOrigin(0.5).setDepth(6.26),
        );
    this.frameLabel = input.scope.resource(
      input.scene.add
        .text(0, 0, 'LEMBRANÇA', {
          align: 'center',
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(6.3),
    );
    input.scope.add(() =>
      input.scene.tweens.killTweensOf([this.previousImage, this.currentImage, this.warmLight]),
    );
  }

  consume(effects: readonly MosaicExperienceEffect[]): void {
    if (effects.some((effect) => effect.type === 'memory-frame-changed')) this.pendingReveal = true;
  }

  layout(bounds: MosaicRect): void {
    this.bounds = bounds;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    this.frameMatte.setPosition(x, y).setSize(bounds.width, bounds.height);
    this.frameBorder.setPosition(x, y).setSize(bounds.width, bounds.height);
    this.art?.setPosition(x, y).setDisplaySize(bounds.width, bounds.height);
    this.warmLight.setPosition(x, y).setSize(bounds.width, bounds.height);
    this.frameLabel.setPosition(x, bounds.y + bounds.height + 8);
  }

  present(framePhoto: MosaicResolvedFramePhoto, slot: MosaicMemoryFrameSlot): void {
    const bounds = this.bounds;
    if (bounds === undefined) return;
    const photo = this.input.photos.photosById.get(framePhoto.photoId);
    if (photo === undefined) return;
    const textureKey = mosaicPhotoTextureKey(
      this.input.photos,
      framePhoto.photoId,
      framePhoto.variant,
    );
    const surface = createPhotoSurface(photo, bounds, 'contain');
    const changed = this.initialized && this.activeTextureKey !== textureKey;
    if (changed && this.pendingReveal && !this.input.reducedMotion) {
      this.reveal(textureKey, surface.photo);
    } else {
      this.currentImage
        .setTexture(textureKey)
        .setPosition(
          surface.photo.x + surface.photo.width / 2,
          surface.photo.y + surface.photo.height / 2,
        )
        .setDisplaySize(surface.photo.width, surface.photo.height)
        .setAlpha(1)
        .setVisible(true);
      this.previousImage.setVisible(false);
    }
    this.activeTextureKey = textureKey;
    this.initialized = true;
    this.pendingReveal = false;
    this.frameLabel.setText(slot === 'anchor' ? 'LEMBRANÇA' : 'NOVA LEMBRANÇA');
  }

  private image(textureKey: string, depth: number): PhaserModule.GameObjects.Image {
    return this.input.scope.resource(
      this.input.scene.add.image(0, 0, textureKey).setOrigin(0.5).setDepth(depth),
    );
  }

  private reveal(
    nextTextureKey: string,
    photo: {
      readonly height: number;
      readonly width: number;
      readonly x: number;
      readonly y: number;
    },
  ): void {
    this.input.scene.tweens.killTweensOf([this.previousImage, this.currentImage, this.warmLight]);
    if (this.activeTextureKey !== undefined) {
      this.previousImage
        .setTexture(this.activeTextureKey)
        .setPosition(this.currentImage.x, this.currentImage.y)
        .setDisplaySize(this.currentImage.displayWidth, this.currentImage.displayHeight)
        .setAlpha(1)
        .setVisible(true);
    }
    this.currentImage
      .setTexture(nextTextureKey)
      .setPosition(photo.x + photo.width / 2, photo.y + photo.height / 2)
      .setDisplaySize(photo.width, photo.height)
      .setAlpha(0)
      .setVisible(true);
    this.warmLight.setAlpha(0.52);
    this.input.scene.tweens.add({
      targets: [this.previousImage, this.currentImage],
      alpha: (target: PhaserModule.GameObjects.Image) => (target === this.currentImage ? 1 : 0),
      duration: 320,
      ease: 'Sine.Out',
      onComplete: () => this.previousImage.setVisible(false),
    });
    this.input.scene.tweens.add({
      targets: this.warmLight,
      alpha: 0,
      duration: 360,
      ease: 'Sine.Out',
    });
  }
}
