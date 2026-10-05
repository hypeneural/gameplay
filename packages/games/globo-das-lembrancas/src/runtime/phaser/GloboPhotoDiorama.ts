import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import type { GloboLayoutManager } from '../GloboLayoutManager.js';

export class GloboPhotoDiorama {
  private readonly pedestalGraphics: Phaser.GameObjects.Graphics;
  private readonly frameShadow: Phaser.GameObjects.Graphics;
  private readonly frameMatte: Phaser.GameObjects.Rectangle;
  private readonly photoImage: Phaser.GameObjects.Image;
  private readonly frameBorder: Phaser.GameObjects.Graphics;
  private readonly crownGlint: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    scope: SceneScope,
    photoKey: string,
  ) {
    // 1. Shadow under frame and pedestal (depth 4)
    this.frameShadow = scene.add.graphics().setDepth(4);

    // 2. Pedestal base plate inside dome (depth 4)
    this.pedestalGraphics = scene.add.graphics().setDepth(4);

    // 3. Dark velvet matte backing (depth 5)
    this.frameMatte = scene.add.rectangle(0, 0, 1, 1, 0x180c06, 0.95).setDepth(5);

    // 4. Customer photograph (depth 6)
    this.photoImage = scene.add.image(0, 0, photoKey).setDepth(6);

    // 5. 3D Carved holiday picture frame with gold filigree and corner bezels (depth 7)
    this.frameBorder = scene.add.graphics().setDepth(7);

    // 6. Golden star glint on frame top crown (depth 8)
    this.crownGlint = scene.add.graphics().setDepth(8);

    scope.add(() => {
      this.frameShadow.destroy();
      this.pedestalGraphics.destroy();
      this.frameMatte.destroy();
      this.photoImage.destroy();
      this.frameBorder.destroy();
      this.crownGlint.destroy();
    });
  }

  get image(): Phaser.GameObjects.Image {
    return this.photoImage;
  }

  layout(layout: GloboLayoutManager): void {
    const photo = layout.assembly.photoNiche.surface.photo;
    const dome = layout.assembly.dome;

    // Position photo image precisely
    const photoCenterX = photo.x + photo.width / 2;
    const photoCenterY = photo.y + photo.height / 2;
    this.photoImage
      .setPosition(photoCenterX, photoCenterY)
      .setDisplaySize(photo.width, photo.height);

    // Matte slightly larger than photo (3px border)
    const mattePadding = 4;
    const frameX = photo.x - mattePadding;
    const frameY = photo.y - mattePadding;
    const frameW = photo.width + mattePadding * 2;
    const frameH = photo.height + mattePadding * 2;

    this.frameMatte.setPosition(frameX + frameW / 2, frameY + frameH / 2).setSize(frameW, frameH);

    // Pedestal stand supporting the framed portrait inside the globe
    const standW = Math.round(frameW * 0.75);
    const standH = Math.round(Math.min(14, dome.radius * 0.08));
    const standX = photoCenterX - standW / 2;
    const standY = frameY + frameH;

    this.pedestalGraphics.clear();
    // Dark mahogany wooden disc
    this.pedestalGraphics.fillStyle(0x2a140a, 0.95);
    this.pedestalGraphics.fillRoundedRect(standX, standY - 2, standW, standH, 4);
    // Gold filigree edge trim on stand
    this.pedestalGraphics.lineStyle(1.5, 0xe8c776, 0.9);
    this.pedestalGraphics.strokeRoundedRect(standX, standY - 2, standW, standH, 4);
    // 2 brass mounting feet
    this.pedestalGraphics.fillStyle(0xd97706, 0.95);
    this.pedestalGraphics.fillCircle(standX + standW * 0.2, standY + standH, 3);
    this.pedestalGraphics.fillCircle(standX + standW * 0.8, standY + standH, 3);

    // Soft contact shadow below frame and pedestal
    this.frameShadow.clear();
    this.frameShadow.fillStyle(0x04080c, 0.45);
    this.frameShadow.fillEllipse(photoCenterX, standY + standH + 2, standW * 0.9, standH * 0.6);

    // 3D Carved Victorian Picture Frame Border
    this.frameBorder.clear();

    // Outer dark wood shadow rim
    this.frameBorder.lineStyle(3.5, 0x140a05, 0.95);
    this.frameBorder.strokeRoundedRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4, 3);

    // Main antique brass/gold filigree frame
    this.frameBorder.lineStyle(2.5, 0xd4af37, 0.95);
    this.frameBorder.strokeRoundedRect(frameX, frameY, frameW, frameH, 2);

    // Inner bright specular highlight bevel
    this.frameBorder.lineStyle(1.2, 0xfff3bc, 0.85);
    this.frameBorder.strokeRoundedRect(frameX + 1.5, frameY + 1.5, frameW - 3, frameH - 3, 1);

    // 4 Antique brass corner bracket rosettes
    const cornerSize = 7;
    const corners = [
      { x: frameX, y: frameY },
      { x: frameX + frameW, y: frameY },
      { x: frameX, y: frameY + frameH },
      { x: frameX + frameW, y: frameY + frameH },
    ];
    for (const c of corners) {
      this.frameBorder.fillStyle(0xf59e0b, 0.95);
      this.frameBorder.fillCircle(c.x, c.y, cornerSize / 2);
      this.frameBorder.fillStyle(0xfff3bc, 0.9);
      this.frameBorder.fillCircle(c.x, c.y, cornerSize / 4);
    }

    // Top crown star ornament
    const crownX = photoCenterX;
    const crownY = frameY - 4;
    this.crownGlint.clear();
    this.crownGlint.fillStyle(0xfffbeb, 0.95);
    // Draw small 4-point golden holiday star on frame crest
    this.drawStar(this.crownGlint, crownX, crownY, 7, 3, 4);
  }

  private drawStar(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number,
  ): void {
    const step = Math.PI / points;
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
  }

  highlight(heroScale: number, durationMs = 900): void {
    const initialScale = this.photoImage.scale;
    this.scene.tweens.add({
      targets: [this.photoImage, this.frameMatte],
      scale: initialScale * heroScale,
      duration: durationMs,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }
}
