import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import type { GloboLayoutManager } from '../GloboLayoutManager.js';
import { globoArtKey } from './GloboProceduralArt.js';

export class WindingKeyObject {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly escutcheon: Phaser.GameObjects.Image;
  private readonly keyShadow: Phaser.GameObjects.Ellipse;
  private readonly hintGlow: Phaser.GameObjects.Image;
  private currentAngleRad = 0;
  private hintTween: Phaser.Tweens.Tween | undefined;
  private baseScaleX = 1.0;
  private baseScaleY = 1.0;
  private baseX = 0;
  private baseY = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    scope: SceneScope,
  ) {
    // 1. Contact shadow projected by the key onto the wooden base (depth 24)
    this.keyShadow = scene.add.ellipse(0, 0, 1, 1, 0x050201, 0.5).setDepth(24);

    // 2. Brass escutcheon mounting plate fixed to the mahogany wood (depth 24)
    this.escutcheon = scene.add
      .image(0, 0, globoArtKey('key-escutcheon-plate'))
      .setDepth(24)
      .setOrigin(0.5, 0.5);

    // 3. Golden invitation hint glow (depth 25)
    this.hintGlow = scene.add
      .image(0, 0, globoArtKey('hint-pulse'))
      .setDepth(25)
      .setOrigin(0.28, 0.5)
      .setAlpha(0);

    // 4. Solid antique brass winding key (depth 26, pivot on axle collar)
    this.sprite = scene.add
      .image(0, 0, 'globo-chave-corda-latao-v1')
      .setDepth(26)
      .setOrigin(0.28, 0.5);

    scope.add(() => {
      this.hintTween?.stop();
      this.keyShadow.destroy();
      this.escutcheon.destroy();
      this.hintGlow.destroy();
      this.sprite.destroy();
    });
  }

  layout(layout: GloboLayoutManager): void {
    const k = layout.key;
    this.baseX = k.x;
    this.baseY = k.y;

    // Escutcheon collar seated onto the right edge of the wood base
    const escutcheonWidth = Math.round(k.width * 0.38);
    const escutcheonHeight = Math.round(k.height * 0.75);
    this.escutcheon
      .setPosition(k.x - k.width * 0.22, k.y)
      .setDisplaySize(escutcheonWidth, escutcheonHeight);

    // Contact shadow
    this.keyShadow
      .setPosition(k.x + k.width * 0.08, k.y + k.height * 0.28)
      .setSize(k.width * 0.7, k.height * 0.22);

    this.sprite.setPosition(k.x, k.y);
    this.sprite.setDisplaySize(k.width, k.height);
    this.baseScaleX = this.sprite.scaleX;
    this.baseScaleY = this.sprite.scaleY;

    this.hintGlow.setPosition(k.x, k.y);
    this.hintGlow.setDisplaySize(k.width * 1.4, k.height * 1.4);
  }

  setRotation(angleRad: number, springCompressionPx = 0): void {
    this.currentAngleRad = angleRad;
    this.sprite.setRotation(this.currentAngleRad);
    // Slight mechanical inward compression towards the base as spring tightens
    this.sprite.setPosition(this.baseX - springCompressionPx, this.baseY);
    this.keyShadow.setPosition(
      this.baseX - springCompressionPx + 4,
      this.baseY + this.sprite.displayHeight * 0.28,
    );
  }

  /**
   * Called on each click or tap step. Advances key rotation by 90 degrees with an elastic bounce.
   */
  stepClockwise(): void {
    this.currentAngleRad += Math.PI / 2;
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      rotation: this.currentAngleRad,
      scaleX: this.baseScaleX * 1.15,
      scaleY: this.baseScaleY * 1.15,
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  pulse(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScaleX * 0.9,
      scaleY: this.baseScaleY * 0.9,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });
  }

  relax(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScaleX,
      scaleY: this.baseScaleY,
      x: this.baseX,
      duration: 120,
      ease: 'Back.easeOut',
    });
  }

  setHint(active: boolean): void {
    this.hintTween?.stop();
    if (!active) {
      this.hintGlow.setAlpha(0);
      return;
    }

    this.hintGlow.setAlpha(0.3).setScale(1.0);
    this.hintTween = this.scene.tweens.add({
      targets: this.hintGlow,
      alpha: { from: 0.3, to: 0.9 },
      scale: { from: 1.0, to: 1.35 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
