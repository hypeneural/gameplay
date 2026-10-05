import type * as PhaserModule from 'phaser';
import type { SceneScope, Rect } from '@christmas-games/platform';
import type { TargetId } from '../../domain/TargetProgress.js';

export interface FrameSocket {
  readonly targetId: TargetId;
  readonly x: number;
  readonly y: number;
  light: PhaserModule.GameObjects.Arc;
  active: boolean;
}

export class MagicalFrameObject {
  private frameBorder?: PhaserModule.GameObjects.Rectangle;
  private frameArt?: PhaserModule.GameObjects.Image;
  private frameShadow: PhaserModule.GameObjects.Rectangle;
  private photoImage: PhaserModule.GameObjects.Image;
  private bannerBg?: PhaserModule.GameObjects.Rectangle;
  private bannerText?: PhaserModule.GameObjects.Text;
  private heroAura: PhaserModule.GameObjects.Graphics;
  readonly sockets: FrameSocket[] = [];

  constructor(
    private readonly scene: PhaserModule.Scene,
    private readonly scope: SceneScope,
    photoKey: string,
    frameRect: Rect,
    photoRect: Rect,
    socketCoords: Array<{ targetId: TargetId; x: number; y: number }>,
    bannerRect: Rect,
    apertureRect?: Rect,
  ) {
    // 1. Soft shadow under frame
    this.frameShadow = this.scene.add
      .rectangle(
        frameRect.x + frameRect.width / 2,
        frameRect.y + frameRect.height / 2 + 6,
        frameRect.width + 12,
        frameRect.height + 12,
        0x000000,
        0.4,
      )
      .setDepth(9);

    // 2. Hero celebration aura (hidden initially, depth 9.5)
    this.heroAura = this.scene.add.graphics().setDepth(9.5);

    // 2.5. Luxurious Victorian velvet passe-partout matting (Depth 9.7)
    // Sits precisely behind the inner frame opening, never bleeding outside the golden rim
    const matting = this.scene.add.graphics().setDepth(9.7);
    matting.fillStyle(0x2d0c12, 1.0); // Royal carmine velvet
    if (apertureRect) {
      matting.fillRect(apertureRect.x, apertureRect.y, apertureRect.width, apertureRect.height);
    } else {
      matting.fillRoundedRect(
        frameRect.x + 8,
        frameRect.y + 8,
        frameRect.width - 16,
        frameRect.height - 16,
        12,
      );
    }
    // Golden bevel trim hugging the photo
    matting.lineStyle(2, 0xd4af37, 0.9);
    matting.strokeRect(photoRect.x - 1, photoRect.y - 1, photoRect.width + 2, photoRect.height + 2);
    this.scope.add(() => matting.destroy());

    // 3. Photo Image (Depth 10)
    this.photoImage = this.scene.add
      .image(photoRect.x + photoRect.width / 2, photoRect.y + photoRect.height / 2, photoKey)
      .setDisplaySize(photoRect.width, photoRect.height)
      .setDepth(10);

    // 4. Ornate Baroque Frame (Depth 15)
    if (this.scene.textures.exists('moldura-ouro')) {
      this.frameArt = this.scene.add
        .image(
          frameRect.x + frameRect.width / 2,
          frameRect.y + frameRect.height / 2,
          'moldura-ouro',
        )
        .setDisplaySize(frameRect.width, frameRect.height)
        .setDepth(15);
    } else {
      // Fallback procedural frame border
      this.frameBorder = this.scene.add
        .rectangle(
          frameRect.x + frameRect.width / 2,
          frameRect.y + frameRect.height / 2,
          frameRect.width,
          frameRect.height,
          0x2d1a0e,
        )
        .setStrokeStyle(6, 0xd4af37, 0.95)
        .setDepth(15);

      this.bannerBg = this.scene.add
        .rectangle(
          bannerRect.x + bannerRect.width / 2,
          bannerRect.y + bannerRect.height / 2,
          bannerRect.width,
          bannerRect.height,
          0x8b0000,
        )
        .setStrokeStyle(2, 0xd4af37, 0.9)
        .setDepth(16);

      this.bannerText = this.scene.add
        .text(
          bannerRect.x + bannerRect.width / 2,
          bannerRect.y + bannerRect.height / 2,
          'Momentos que ficam para sempre ♡',
          {
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: '11px',
            color: '#fff3d9',
          },
        )
        .setOrigin(0.5)
        .setDepth(17);
    }

    // 5. 4 Sockets / Light Nodes (Depth 16)
    for (const s of socketCoords) {
      if (!this.frameArt) {
        this.scene.add.circle(s.x, s.y, 8, 0x3d2817).setStrokeStyle(2, 0xd4af37, 0.8).setDepth(16);
      }
      const light = this.scene.add.circle(s.x, s.y, 6, 0xffe2a6, 0.0).setDepth(17);

      this.sockets.push({
        targetId: s.targetId,
        x: s.x,
        y: s.y,
        light,
        active: false,
      });
    }

    if (this.frameArt) {
      this.frameShadow.setVisible(false);
    }

    this.scope.add(() => this.destroy());
  }

  slotFragment(targetId: TargetId, fromX: number, fromY: number, onComplete?: () => void): void {
    const socket = this.sockets.find((s) => s.targetId === targetId);
    if (!socket) {
      onComplete?.();
      return;
    }

    // 1. Spawn flying talisman particle
    const talisman = this.scene.add.circle(fromX, fromY, 10, 0xffd700).setDepth(40);
    const innerSpark = this.scene.add.circle(fromX, fromY, 5, 0xffffff).setDepth(41);

    // Arc path via midpoint control
    const midX = (fromX + socket.x) / 2 + (fromX < socket.x ? -30 : 30);
    const midY = Math.min(fromY, socket.y) - 50;

    const progressObj = { t: 0 };
    this.scene.tweens.add({
      targets: progressObj,
      t: 1,
      duration: 650,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        const t = progressObj.t;
        const oneMinusT = 1 - t;
        const px = oneMinusT * oneMinusT * fromX + 2 * oneMinusT * t * midX + t * t * socket.x;
        const py = oneMinusT * oneMinusT * fromY + 2 * oneMinusT * t * midY + t * t * socket.y;
        talisman.setPosition(px, py);
        innerSpark.setPosition(px, py);
      },
      onComplete: () => {
        talisman.destroy();
        innerSpark.destroy();

        // Socket locks and lights up
        socket.active = true;
        socket.light.setFillStyle(0xffd700, 1.0);

        // Flash pulse
        this.scene.tweens.add({
          targets: socket.light,
          scale: { from: 1.8, to: 1.0 },
          duration: 300,
          ease: 'Back.easeOut',
          onComplete: () => onComplete?.(),
        });
      },
    });
  }

  setHeroIllumination(active: boolean): void {
    this.heroAura.clear();
    if (!active) return;

    // Draw radiant golden halos behind frame
    const fx = this.frameArt?.x ?? this.frameBorder?.x ?? 0;
    const fy = this.frameArt?.y ?? this.frameBorder?.y ?? 0;
    const fw = this.frameArt?.displayWidth ?? this.frameBorder?.width ?? 0;
    const fh = this.frameArt?.displayHeight ?? this.frameBorder?.height ?? 0;

    this.heroAura.fillStyle(0xffd700, 0.25);
    this.heroAura.fillRoundedRect(fx - fw / 2 - 16, fy - fh / 2 - 16, fw + 32, fh + 32, 16);
    this.heroAura.fillStyle(0xfff3a8, 0.4);
    this.heroAura.fillRoundedRect(fx - fw / 2 - 8, fy - fh / 2 - 8, fw + 16, fh + 16, 12);
  }

  pulseGarland(): void {
    if (this.frameArt) {
      const baseScaleX = this.frameArt.scaleX;
      const baseScaleY = this.frameArt.scaleY;
      this.scene.tweens.add({
        targets: this.frameArt,
        scaleX: { from: baseScaleX, to: baseScaleX * 1.04 },
        scaleY: { from: baseScaleY, to: baseScaleY * 1.04 },
        yoyo: true,
        duration: 250,
        ease: 'Back.easeOut',
      });
    } else {
      const targets = [this.frameBorder, this.bannerBg].filter(Boolean);
      if (targets.length === 0) return;
      this.scene.tweens.add({
        targets,
        scale: { from: 1.0, to: 1.04 },
        yoyo: true,
        duration: 250,
        ease: 'Back.easeOut',
      });
    }
  }

  triggerCelebration(): void {
    this.setHeroIllumination(true);
    this.pulseGarland();
  }

  update(_delta?: number): void {
    // Optional frame animation tick
  }

  destroy(): void {
    this.frameArt?.destroy();
    this.frameBorder?.destroy();
    this.frameShadow.destroy();
    this.photoImage.destroy();
    this.bannerBg?.destroy();
    this.bannerText?.destroy();
    this.heroAura.destroy();
    for (const s of this.sockets) {
      s.light.destroy();
    }
  }
}
