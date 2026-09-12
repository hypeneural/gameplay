import type * as Phaser from 'phaser';
import type { MagicPhotoStateMachine } from '../../domain/MagicPhotoStateMachine.js';
import type { PhotoLayoutManager } from '../PhotoLayoutManager.js';
import { artKey } from './ProceduralArt.js';
import { visualKey } from './visualAssets.js';

/** Two frames of one material sprite keep the closed seam pixel-perfect. */
export class GiftController {
  readonly root: Phaser.GameObjects.Container;
  private readonly lid: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly rays: Phaser.GameObjects.Graphics;
  private readonly lidY: number;

  constructor(
    scene: Phaser.Scene,
    private readonly reduced: boolean,
  ) {
    this.root = scene.add.container(0, 0).setDepth(5);
    const texture = scene.textures.get(visualKey('gift-real-v2'));
    const source = texture.get();
    const seam = Math.round(source.height * 0.532);
    texture.add('lid', 0, 0, 0, source.width, seam);
    texture.add('body', 0, 0, seam, source.width, source.height - seam);
    const ratio = 360 / source.width;
    this.lidY = -210 + (seam * ratio) / 2;
    this.shadow = scene.add.image(0, 145, artKey('shadow')).setDisplaySize(385, 70).setAlpha(0.72);
    this.glow = scene.add.image(0, -55, artKey('glow')).setDisplaySize(510, 520);
    this.rays = scene.add.graphics();
    this.body = scene.add
      .image(0, -210 + (seam + (source.height - seam) / 2) * ratio, texture, 'body')
      .setScale(ratio);
    this.lid = scene.add.image(0, this.lidY, texture, 'lid').setScale(ratio);
    this.root.add([this.shadow, this.glow, this.rays, this.body, this.lid]);
  }

  render(model: MagicPhotoStateMachine, layout: PhotoLayoutManager): void {
    const state = model.state;
    const visible = [
      'INTRO',
      'GIFT_IDLE',
      'GIFT_TOUCH_1',
      'GIFT_TOUCH_2',
      'GIFT_READY',
      'RIBBON_DRAG',
      'GIFT_OPENING',
      'PHOTO_REVEAL',
    ].includes(state);
    this.root.setVisible(visible);
    if (!visible) return;
    const t = model.stateElapsedMs;
    const motion = !this.reduced;
    const tapped = ['GIFT_TOUCH_1', 'GIFT_TOUCH_2', 'GIFT_READY'].includes(state);
    const spring = tapped && motion ? Math.exp(-t / 115) * Math.cos(t / 44) : 0;
    const pull = model.ribbonProgress;
    const opening =
      state === 'GIFT_OPENING' ? Math.min(1, t / 1050) : state === 'PHOTO_REVEAL' ? 1 : 0;
    const lift = Math.max(0, (opening - 0.2) / 0.8);
    const ease = 1 - Math.pow(1 - lift, 3);
    const breathe = motion ? Math.sin(model.elapsedMs / 1050) : 0;
    const jump =
      motion && state === 'GIFT_READY' ? Math.sin(Math.min(1, t / 390) * Math.PI) * 17 : 0;
    const entrance = state === 'INTRO' && motion ? Math.pow(1 - Math.min(1, t / 600), 3) * 35 : 0;
    this.root.setPosition(layout.gift.x, layout.gift.y - jump + entrance);
    this.root.setScale(
      layout.gift.scale * (1 + spring * 0.045),
      layout.gift.scale * (1 - spring * 0.055),
    );
    this.root.setAngle(
      motion
        ? state === 'GIFT_TOUCH_2'
          ? Math.sin(t / 35) * Math.exp(-t / 150) * 5
          : pull * Math.sin(t / 42) * 0.65
        : 0,
    );
    this.root.setAlpha(
      state === 'PHOTO_REVEAL'
        ? Math.max(0, 1 - t / 520)
        : state === 'INTRO'
          ? Math.min(1, 0.3 + t / 350)
          : 1,
    );
    this.glow.setAlpha(0.23 + breathe * 0.025 + pull * 0.15 + Math.sin(opening * Math.PI) * 0.55);
    this.glow.setDisplaySize(510 + ease * 220, 520 + ease * 260);
    this.shadow.setAlpha(0.72 - jump * 0.015).setScale(1.5 + jump * 0.005, 0.27);
    const ratio = 360 / this.lid.texture.get().width;
    this.lid.setPosition(
      motion ? ease * -52 : 0,
      this.lidY - (motion ? ease * 245 : ease * 30) - pull * 7,
    );
    this.lid.setScale(ratio * (1 + pull * 0.018), ratio * (1 + pull * 0.024));
    this.lid.setAngle(motion ? -ease * 18 : 0).setAlpha(1 - Math.pow(lift, 2));
    this.body.setAlpha(1 - ease * 0.32);
    this.rays.clear();
    if (opening > 0 && opening < 1) {
      const alpha = Math.sin(opening * Math.PI) * 0.2;
      for (let i = 0; i < 5; i++) {
        this.rays.fillStyle(i % 2 ? 0xffd89a : 0xfff2cd, alpha);
        this.rays.fillTriangle(
          -80 + i * 35,
          -20,
          -230 + i * 115,
          -280 * ease - 35,
          -165 + i * 100,
          -300 * ease - 35,
        );
      }
    }
  }

  contains(x: number, y: number, layout: PhotoLayoutManager): boolean {
    return (
      Math.abs(x - layout.gift.x) < 185 * layout.gift.scale &&
      Math.abs(y - layout.gift.y) < 170 * layout.gift.scale
    );
  }
  bowContains(x: number, y: number, layout: PhotoLayoutManager): boolean {
    return (
      Math.abs(x - layout.gift.x) < Math.max(64, 170 * layout.gift.scale) &&
      Math.abs(y - (layout.gift.y - 146 * layout.gift.scale)) < Math.max(52, 94 * layout.gift.scale)
    );
  }
}
