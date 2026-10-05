import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import type { Point } from '../../domain/GloboGeometry.js';
import type { GloboLayoutManager } from '../GloboLayoutManager.js';
import { globoArtKey } from './GloboProceduralArt.js';

export class GlobeGlassController {
  readonly surface: Phaser.GameObjects.RenderTexture;
  private readonly brush: Phaser.GameObjects.Image;
  private readonly width: number;
  private readonly height: number;
  private dirty = false;

  constructor(scene: Phaser.Scene, scope: SceneScope, size: number) {
    this.width = Math.round(size);
    this.height = Math.round(size);

    this.surface = scene.add.renderTexture(0, 0, this.width, this.height).setOrigin(0).setDepth(15);

    this.brush = scene.add.image(0, 0, globoArtKey('steam-brush'));
    scene.children.remove(this.brush);
    const brushSize = Math.round(Math.min(this.width, this.height) * 0.24);
    this.brush.setDisplaySize(brushSize, brushSize);

    scope.add(() => {
      this.brush.destroy();
      this.surface.destroy();
    });

    this.restore();
  }

  layout(layout: GloboLayoutManager): void {
    const photo = layout.photoSurface.photo;
    this.surface.setPosition(photo.x, photo.y).setDisplaySize(photo.width, photo.height);
  }

  erase(fromNorm: Point, toNorm: Point): void {
    const distance = Math.hypot(
      (toNorm.x - fromNorm.x) * this.width,
      (toNorm.y - fromNorm.y) * this.height,
    );
    const steps = Math.max(1, Math.ceil(distance / 8));

    for (let i = 0; i <= steps; i++) {
      const x = (fromNorm.x + ((toNorm.x - fromNorm.x) * i) / steps) * this.width;
      const y = (fromNorm.y + ((toNorm.y - fromNorm.y) * i) / steps) * this.height;
      this.surface.erase(this.brush, x, y);
    }
    this.dirty = true;
  }

  flush(): void {
    if (this.dirty) {
      this.surface.render();
      this.dirty = false;
    }
  }

  restore(): void {
    this.surface.clear();
    // Soft translucent frost haze: photo stays vibrant and readable from frame 0
    this.surface.fill(0xedf6fc, 0.24);
    this.dirty = true;
    this.flush();
  }

  setVisible(visible: boolean): void {
    this.surface.setVisible(visible);
  }

  setAlpha(alpha: number): void {
    this.surface.setAlpha(alpha);
  }
}
