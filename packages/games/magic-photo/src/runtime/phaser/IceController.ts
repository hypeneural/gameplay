import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import type { Point } from '../../domain/PhotoGeometry.js';
import type { IceGrid } from '../../domain/IceGrid.js';
import type { PhotoLayoutManager } from '../PhotoLayoutManager.js';
import { artKey } from './ProceduralArt.js';
import { visualKey } from './visualAssets.js';

export class IceController {
  readonly surface: Phaser.GameObjects.RenderTexture;
  readonly crown: Phaser.GameObjects.Image;
  private readonly brush: Phaser.GameObjects.Image;
  private readonly width: number;
  private readonly height: number;
  private readonly frostKey = artKey('frost');
  private dirty = false;

  constructor(
    scene: Phaser.Scene,
    scope: SceneScope,
    aspect: number,
    private readonly grid: IceGrid,
  ) {
    this.width = Math.round((640 * Math.min(1, aspect)) / 2) * 2;
    this.height = Math.round((640 * Math.min(1, 1 / aspect)) / 2) * 2;
    const frost = scene.textures.createCanvas(this.frostKey, this.width, this.height)!;
    const c = frost.context;
    const material = scene.textures
      .get(visualKey('frost-real-v2'))
      .getSourceImage() as HTMLImageElement;
    // Dense optical layer, independent from the untouched photo below.
    c.globalAlpha = 0.93;
    const materialScale = Math.max(this.width / material.width, this.height / material.height);
    c.drawImage(
      material,
      (this.width - material.width * materialScale) / 2,
      (this.height - material.height * materialScale) / 2,
      material.width * materialScale,
      material.height * materialScale,
    );
    c.globalAlpha = 1;
    const sheen = c.createLinearGradient(0, 0, this.width, this.height);
    sheen.addColorStop(0, '#f2fdff40');
    sheen.addColorStop(0.35, '#d5f5ff06');
    sheen.addColorStop(0.49, '#ffffff23');
    sheen.addColorStop(0.58, '#a0d6ed05');
    sheen.addColorStop(1, '#d6f4ff32');
    c.fillStyle = sheen;
    c.fillRect(0, 0, this.width, this.height);
    frost.refresh();
    scope.texture(scene.textures, this.frostKey);
    this.surface = scene.add
      .renderTexture(0, 0, this.width, this.height)
      .setOrigin(0)
      .setDepth(8)
      .setVisible(false);
    this.crown = scene.add
      .image(0, 0, visualKey('snow-edge-v2'))
      .setOrigin(0.5, 0)
      .setDepth(9)
      .setVisible(false);
    this.brush = scene.add.image(0, 0, artKey('brush'));
    scene.children.remove(this.brush);
    this.brush.setDisplaySize(
      Math.min(this.width, this.height) * 0.23,
      Math.min(this.width, this.height) * 0.23,
    );
    scope.add(() => this.brush.destroy());
    scope.add(() => this.surface.destroy());
    this.restore();
  }

  layout(layout: PhotoLayoutManager): void {
    const p = layout.photo;
    // Never resize the framebuffer: normalized erase content survives rotation.
    this.surface.setPosition(p.x, p.y).setDisplaySize(p.width, p.height);
    this.crown
      .setPosition(p.x + p.width / 2, p.y - 11)
      .setDisplaySize(p.width + 10, Math.min((p.width + 10) / 3, p.height * 0.22));
  }

  erase(from: Point, to: Point): void {
    const distance = Math.hypot((to.x - from.x) * this.width, (to.y - from.y) * this.height);
    const steps = Math.max(1, Math.ceil(distance / 9));
    for (let i = 0; i <= steps; i++) {
      const x = (from.x + ((to.x - from.x) * i) / steps) * this.width;
      const y = (from.y + ((to.y - from.y) * i) / steps) * this.height;
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
    this.surface.clear().stamp(this.frostKey, undefined, 0, 0, { originX: 0, originY: 0 }).render();
    for (const cell of this.grid.cells) {
      if (!cell.revealed) continue;
      this.surface.stamp(artKey('brush'), undefined, cell.x * this.width, cell.y * this.height, {
        scaleX: this.width / this.grid.columns / 80,
        scaleY: this.height / this.grid.rows / 80,
        blendMode: 17,
      });
    }
    this.surface.render();
  }
}
