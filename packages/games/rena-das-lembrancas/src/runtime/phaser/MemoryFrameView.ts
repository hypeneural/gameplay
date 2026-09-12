import { createPhotoSurface } from '@christmas-games/platform';
import type { Photo } from '@christmas-games/platform';
import type * as Phaser from 'phaser';

export const rudolphFrames = {
  material: {
    key: 'rudolph-frame-material-v3',
    url: '/assets/rena-das-lembrancas/art/frame-material-v3.webp',
  },
};

/** The photograph is above the opaque material. The shared corners never stretch. */
export class MemoryFrameView {
  readonly container: Phaser.GameObjects.Container;
  readonly photo: Phaser.GameObjects.Image;
  private readonly rim: Phaser.GameObjects.NineSlice | undefined;
  private readonly underlay: Phaser.GameObjects.Graphics;
  private lastMaxWidth = -1;
  private lastMaxHeight = -1;
  height = 1;
  width = 1;

  constructor(
    scene: Phaser.Scene,
    private readonly source: Photo,
    texture: string,
    depth = 10,
    private readonly golden = false,
    private readonly presentation = false,
  ) {
    this.underlay = scene.add.graphics();
    if (scene.game.renderer.type === 2)
      this.rim = scene.add.nineslice(
        0,
        0,
        rudolphFrames.material.key,
        undefined,
        640,
        640,
        96,
        96,
        96,
        96,
      );
    this.photo = scene.add.image(0, 0, texture);
    this.container = scene.add
      .container(0, 0, [this.underlay, ...(this.rim ? [this.rim] : []), this.photo])
      .setDepth(depth);
  }

  layout(x: number, y: number, maxWidth: number, maxHeight: number): void {
    this.container.setPosition(x, y);
    if (maxWidth === this.lastMaxWidth && maxHeight === this.lastMaxHeight) return;
    this.lastMaxWidth = maxWidth;
    this.lastMaxHeight = maxHeight;
    const border = Math.max(
      2,
      Math.min(this.presentation ? 11 : 12, Math.min(maxWidth, maxHeight) * 0.09),
    );
    const fitted = createPhotoSurface(
      this.source,
      {
        x: 0,
        y: 0,
        width: Math.max(1, maxWidth - border * 2),
        height: Math.max(1, maxHeight - border * 2),
      },
      'contain',
    ).photo;
    this.width = fitted.width + border * 2;
    this.height = fitted.height + border * 2;
    this.photo.setPosition(0, 0).setDisplaySize(fitted.width, fitted.height);
    this.underlay
      .clear()
      .fillStyle(0x000c14, 0.3)
      .fillRoundedRect(-this.width / 2 + 2, -this.height / 2 + 4, this.width, this.height, 2);
    if (this.rim) {
      const scale = border / 96;
      this.rim.setSize(this.width / scale, this.height / scale).setScale(scale);
    } else {
      this.underlay
        .fillStyle(0x805331)
        .fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      this.underlay
        .lineStyle(2, 0xb89961)
        .strokeRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width - 4, this.height - 4);
      this.underlay
        .fillStyle(0xf2e8d3)
        .fillRect(
          -this.width / 2 + border * 0.7,
          -this.height / 2 + border * 0.7,
          this.width - border * 1.4,
          this.height - border * 1.4,
        );
    }
    if (this.golden)
      this.underlay
        .lineStyle(2, 0xffd583, 0.9)
        .strokeRoundedRect(
          -this.width / 2 - 3,
          -this.height / 2 - 3,
          this.width + 6,
          this.height + 6,
          5,
        );
  }

  destroy(): void {
    this.container.destroy();
  }
}
