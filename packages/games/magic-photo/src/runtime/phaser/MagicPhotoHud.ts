import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import { attachCrystalControl } from '@christmas-games/theme';
import type { MagicPhotoStateMachine } from '../../domain/MagicPhotoStateMachine.js';
import type { PhotoLayoutManager } from '../PhotoLayoutManager.js';
import { artKey } from './ProceduralArt.js';

/** A dark material backing keeps the instruction readable on both snow and sky. */
export class InstructionPanel {
  private readonly target: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private changedAt = 0;
  private previous = '';
  private wrapWidth = 0;

  constructor(
    scene: Phaser.Scene,
    scope: SceneScope,
    private readonly reduced: boolean,
  ) {
    this.target = scene.add.rectangle(0, 0, 300, 60, 0, 0).setDepth(19).setVisible(false);
    attachCrystalControl({
      target: this.target,
      graphics: scene.add.graphics().setDepth(19),
      events: scene.events,
      scope,
      panel: true,
      icon: 'hint',
      labelLayout: 'inline',
      reducedMotion: reduced,
    });
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'Nunito, sans-serif',
        fontStyle: 'bold',
        fontSize: '18px',
        color: '#fff9e9',
        align: 'center',
        resolution: 2,
        shadow: { offsetX: 0, offsetY: 2, color: '#010917', blur: 3, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(20);
  }

  render(text: string, layout: PhotoLayoutManager, now: number, y: number, visible: boolean): void {
    visible &&= text.length > 0;
    this.target.setVisible(visible);
    this.label.setVisible(visible);
    if (!visible) return;
    if (text !== this.previous) {
      this.changedAt = now;
      this.previous = text;
    }
    const width = Math.min(470, layout.width - 24);
    // Phaser rerasterizes Text even if setWordWrapWidth receives the same value.
    if (this.wrapWidth !== width - 64) {
      this.wrapWidth = width - 64;
      this.label.setWordWrapWidth(this.wrapWidth);
    }
    const font = layout.width < 360 || layout.height < 500 ? 16 : 18;
    const height = layout.height < 500 ? 54 : 62;
    const t = Math.min(1, (now - this.changedAt) / 460);
    const shift = this.reduced ? 0 : Math.pow(1 - t, 3) * 7;
    const center = Math.min(layout.height - height / 2 - 9, y) + shift;
    this.target.setPosition(layout.width / 2, center).setSize(width, height);
    this.label
      .setText(text)
      .setFontSize(font)
      .setPosition(layout.width / 2 + 17, center - 1);
  }
}

/** Large touch slots: filled stars celebrate; pending stars request an honest hint. */
export class DiscoveryStars {
  private readonly target: Phaser.GameObjects.Rectangle;
  private readonly labels: Phaser.GameObjects.Image[];
  private readonly halos: Phaser.GameObjects.Image[];
  private readonly caption: Phaser.GameObjects.Text;
  private readonly activatedAt = [-10000, -10000, -10000, -10000, -10000];
  private previousFound = 0;
  private appearedAt: number | undefined;
  private visible = false;
  private centerY = 90;
  private centerX = 0;
  private readonly spacing = 46;

  constructor(
    scene: Phaser.Scene,
    scope: SceneScope,
    private readonly reduced: boolean,
  ) {
    this.target = scene.add.rectangle(0, 0, 254, 70, 0, 0).setDepth(21).setVisible(false);
    attachCrystalControl({
      target: this.target,
      graphics: scene.add.graphics().setDepth(21),
      events: scene.events,
      scope,
      panel: true,
      reducedMotion: reduced,
    });
    this.halos = Array.from({ length: 5 }, () =>
      scene.add.image(0, 0, artKey('glow')).setDisplaySize(49, 49).setDepth(22).setVisible(false),
    );
    this.labels = Array.from({ length: 5 }, () =>
      scene.add
        .image(0, 0, artKey('star-empty'))
        .setDisplaySize(32, 32)
        .setDepth(23)
        .setVisible(false),
    );
    this.caption = scene.add
      .text(0, 0, '', {
        fontFamily: 'Nunito, sans-serif',
        fontStyle: 'bold',
        fontSize: '11px',
        color: '#e3f3ff',
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(23)
      .setVisible(false);
  }

  render(model: MagicPhotoStateMachine, layout: PhotoLayoutManager): void {
    this.visible = ['MAGIC_HUNT', 'MAGIC_COMPLETE'].includes(model.state);
    this.target.setVisible(this.visible);
    this.caption.setVisible(this.visible);
    this.labels.forEach((image) => image.setVisible(this.visible));
    this.halos.forEach((image) => image.setVisible(this.visible));
    if (!this.visible) return;
    this.appearedAt ??= model.elapsedMs;
    this.centerX = layout.width / 2;
    const compact = layout.height < 500 && layout.width >= 600;
    this.centerY = compact ? 28 : 86;
    this.target.setPosition(this.centerX, compact ? 35 : 95).setSize(254, compact ? 64 : 70);
    this.caption
      .setPosition(this.centerX, compact ? 58 : 117)
      .setText(`${model.found} de 5  ·  Toque nas estrelas`);
    if (model.found > this.previousFound) {
      for (let i = this.previousFound; i < model.found; i++) this.activatedAt[i] = model.elapsedMs;
      this.previousFound = model.found;
    }
    this.labels.forEach((image, index) => {
      const filled = index < model.found;
      const age = model.elapsedMs - this.activatedAt[index]!;
      const pop = this.reduced
        ? 0
        : Math.max(0, Math.sin(Math.min(1, age / 650) * Math.PI)) * Math.exp(-age / 1000);
      const introAge = model.elapsedMs - this.appearedAt! - index * 110;
      const arrive =
        !this.reduced && introAge >= 0 && introAge < 500
          ? Math.sin((introAge / 500) * Math.PI) * 0.08
          : 0;
      const point = this.position(index);
      const size = (filled ? 34 : 31) * (1 + pop * 0.3 + arrive);
      image
        .setTexture(artKey(filled ? 'star-filled' : 'star-empty'))
        .setDisplaySize(size, size)
        .setPosition(point.x, point.y - pop * 3)
        .setAngle(this.reduced ? 0 : Math.sin(age / 90) * pop * 8);
      this.halos[index]!.setPosition(point.x, point.y).setAlpha(
        filled ? 0.22 + pop * 0.5 : pop * 0.4,
      );
    });
  }

  hitIndex(x: number, y: number): number | undefined {
    if (!this.visible || Math.abs(y - this.centerY) > 24) return;
    const index = Math.round((x - this.centerX) / this.spacing + 2);
    if (index >= 0 && index < 5 && Math.abs(x - this.position(index).x) <= 23) return index;
  }

  position(index: number): { x: number; y: number } {
    return { x: this.centerX + (index - 2) * this.spacing, y: this.centerY };
  }

  touch(index: number, now: number): void {
    this.activatedAt[index] = now;
  }
}
