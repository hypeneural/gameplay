import type * as PhaserModule from 'phaser';
import type { SceneScope, Rect } from '@christmas-games/platform';
import type { TactileButtonLayout } from '../SlingshotLayoutManager.js';

export interface ButtonVisual {
  layout: TactileButtonLayout;
  container: PhaserModule.GameObjects.Container;
  bgCircle: PhaserModule.GameObjects.Arc;
  innerCircle: PhaserModule.GameObjects.Arc;
  iconText: PhaserModule.GameObjects.Text;
  isPressed: boolean;
}

const BUTTON_THEMES: Record<
  'note' | 'tree' | 'snowflake' | 'bell',
  { color: number; icon: string }
> = {
  note: { color: 0x8b0000, icon: '♫' },
  tree: { color: 0x1f5c38, icon: '🎄' },
  snowflake: { color: 0x1a4568, icon: '❄' },
  bell: { color: 0x8b5a2b, icon: '🔔' },
};

const MEDALLION_TEXTURES: Record<'note' | 'tree' | 'snowflake' | 'bell', string> = {
  note: 'botao-medallion-music',
  tree: 'botao-medallion-tree',
  snowflake: 'botao-medallion-snow',
  bell: 'botao-medallion-bell',
};

export class MagicButtonPanel {
  private shelfBg?: PhaserModule.GameObjects.Rectangle;
  private shelfSnow?: PhaserModule.GameObjects.Graphics;
  private buttons: ButtonVisual[] = [];
  private lastClickTime = 0;

  constructor(
    private readonly scene: PhaserModule.Scene,
    private readonly scope: SceneScope,
    shelfRect: Rect,
    buttonLayouts: readonly TactileButtonLayout[],
    private readonly onTrigger: (id: 'note' | 'tree' | 'snowflake' | 'bell') => void,
  ) {
    // 1. Fallback shelf if background art not present
    if (!this.scene.textures.exists('estilingue-bg')) {
      this.shelfBg = this.scene.add
        .rectangle(
          shelfRect.x + shelfRect.width / 2,
          shelfRect.y + shelfRect.height / 2,
          shelfRect.width,
          shelfRect.height,
          0x2d1a0e,
        )
        .setDepth(35);

      this.shelfSnow = this.scene.add.graphics().setDepth(36);
      this.shelfSnow.fillStyle(0xffffff, 0.9);
      this.shelfSnow.fillRect(shelfRect.x, shelfRect.y, shelfRect.width, 4);
    }

    // 2. The 4 Tactile Circular Medallions (Depth 40)
    for (const b of buttonLayouts) {
      const r = b.radius;
      const texKey = MEDALLION_TEXTURES[b.id];
      const children: PhaserModule.GameObjects.GameObject[] = [];

      let bgCircle: PhaserModule.GameObjects.Arc;
      let innerCircle: PhaserModule.GameObjects.Arc;
      let iconText: PhaserModule.GameObjects.Text;

      if (this.scene.textures.exists(texKey)) {
        const medallionImg = this.scene.add.image(0, 0, texKey).setDisplaySize(r * 2.15, r * 2.15);
        children.push(medallionImg);
        // Dummy fallback shapes to satisfy interface
        bgCircle = this.scene.add.circle(0, 0, 1, 0x000000, 0);
        innerCircle = this.scene.add.circle(0, 0, 1, 0x000000, 0);
        iconText = this.scene.add.text(0, 0, '', {}).setVisible(false);
      } else {
        const theme = BUTTON_THEMES[b.id];
        bgCircle = this.scene.add.circle(0, 0, r, 0xd4af37).setStrokeStyle(2, 0x8b6508);
        innerCircle = this.scene.add
          .circle(0, 0, r * 0.82, theme.color)
          .setStrokeStyle(1.5, 0xffd700, 0.6);
        iconText = this.scene.add
          .text(0, 0, theme.icon, {
            fontSize: `${Math.round(r * 0.9)}px`,
            color: '#fff3d9',
          })
          .setOrigin(0.5);
        children.push(bgCircle, innerCircle, iconText);
      }

      // Glowing illumination halo (flashes on tap)
      const glowRing = this.scene.add
        .circle(0, 0, r * 1.15, 0xffd700, 0)
        .setStrokeStyle(3, 0xffe2a6, 0);
      children.push(glowRing);

      const container = this.scene.add.container(b.x, b.y, children).setDepth(40);

      // Make interactive hit area with generous touch bounds
      const hitZone = this.scene.add
        .zone(0, 0, Math.max(56, b.hitArea.width), Math.max(56, b.hitArea.height))
        .setInteractive({ useHandCursor: true });
      container.add(hitZone);

      const btnVisual: ButtonVisual = {
        layout: b,
        container,
        bgCircle,
        innerCircle,
        iconText,
        isPressed: false,
      };

      // Instant pointerdown tactile response (3D depression & illumination)
      hitZone.on('pointerdown', (pointer: PhaserModule.Input.Pointer) => {
        const now = this.scene.time.now;
        if (now - this.lastClickTime < 90) return; // 90ms debounce
        this.lastClickTime = now;

        btnVisual.isPressed = true;
        container.setScale(0.88);
        container.setY(b.y + 4);

        // Flash golden aura ring
        glowRing.setAlpha(0.9);
        glowRing.setScale(1.0);
        this.scene.tweens.add({
          targets: glowRing,
          alpha: 0,
          scale: 1.35,
          duration: 350,
          ease: 'Sine.easeOut',
        });

        this.onTrigger(b.id);
        pointer.event.stopPropagation();
      });

      const releaseButton = () => {
        if (!btnVisual.isPressed) return;
        btnVisual.isPressed = false;

        this.scene.tweens.add({
          targets: container,
          scale: 1.0,
          y: b.y,
          duration: 180,
          ease: 'Back.easeOut',
        });
      };

      hitZone.on('pointerup', releaseButton);
      hitZone.on('pointerout', releaseButton);
    }

    this.scope.add(() => this.destroy());
  }

  destroy(): void {
    this.shelfBg?.destroy();
    this.shelfSnow?.destroy();
    for (const b of this.buttons) {
      b.container.destroy();
    }
  }
}
