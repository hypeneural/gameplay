import type * as Phaser from 'phaser';
import type { RudolphLayout } from '../RudolphLayout.js';

export const rudolphWorldAssets = ['winter-world-v1', 'winter-landscape-v1', 'santa-sleigh-v1'].map(
  (name) => ({
    key: `rudolph-${name}`,
    url: `/assets/rena-das-lembrancas/art/${name}.webp`,
  }),
);

/** Retained scenery and finite responses; no emitters or accumulating tweens. */
export class RudolphWorld {
  private readonly background: Phaser.GameObjects.Image;
  private readonly lights: Phaser.GameObjects.Graphics;
  private readonly response: Phaser.GameObjects.Graphics;
  private readonly santa: Phaser.GameObjects.Image;
  private santaSeconds = 0;
  private touch: { x: number; y: number; remaining: number; light: boolean } | undefined;

  constructor(scene: Phaser.Scene) {
    this.background = scene.add
      .image(0, 0, 'rudolph-winter-world-v1')
      .setOrigin(0.5, 1)
      .setDepth(-20);
    this.lights = scene.add.graphics().setDepth(-10);
    this.response = scene.add.graphics().setDepth(-8);
    this.santa = scene.add.image(0, 0, 'rudolph-santa-sleigh-v1').setDepth(12).setVisible(false);
  }
  layout(p: RudolphLayout): void {
    // Portrait keeps the moon and clearing. Rotation uses the same scene with a calm side lane.
    const landscape = p.width > p.height * 1.25;
    this.background.setTexture(
      landscape ? 'rudolph-winter-landscape-v1' : 'rudolph-winter-world-v1',
    );
    const scale = landscape
      ? Math.max(p.width / 1000, p.height / 667)
      : Math.max(p.width / 800, p.height / 1200);
    this.background.setPosition(p.width / 2, p.height).setScale(scale);
    this.lights
      .clear()
      .lineStyle(1.5, 0xa98b52, 0.8)
      .beginPath()
      .moveTo(0, 66)
      .lineTo(p.width, 66)
      .strokePath();
    for (let index = 0; index < 13; index++) {
      const x = (index * p.width) / 12;
      this.lights.fillStyle(0xf5c978, 0.1).fillCircle(x, 67, 11);
      this.lights.fillStyle(0xffe4b3, 0.95).fillCircle(x, 67, 2.2);
    }
  }
  deliver(): void {
    this.santaSeconds = 2.8;
  }
  tap(x: number, y: number, p: RudolphLayout): 'bells' | 'snow' {
    const light = y < 105 || (y > p.height * 0.63 && (x < p.width * 0.12 || x > p.width * 0.88));
    this.touch = { x, y, remaining: 0.6, light };
    return light ? 'bells' : 'snow';
  }
  render(dt: number, p: RudolphLayout, calm: boolean): void {
    this.santaSeconds = Math.max(0, this.santaSeconds - dt);
    this.santa.setVisible(this.santaSeconds > 0);
    if (this.santaSeconds > 0) {
      const progress = 1 - this.santaSeconds / 2.8;
      const width = Math.min(126, p.hero.width * 0.7);
      this.santa
        .setDisplaySize(width, (width * 297) / 360)
        .setPosition(calm ? p.hero.x : -80 + (p.width + 160) * progress, p.hero.y);
    }
    this.response.clear();
    if (!this.touch) return;
    this.touch.remaining = Math.max(0, this.touch.remaining - dt);
    if (this.touch.remaining === 0) {
      this.touch = undefined;
      return;
    }
    const t = 1 - this.touch.remaining / 0.6;
    const { x, y, light } = this.touch;
    this.response
      .lineStyle(2, light ? 0xffd58b : 0xe0eef4, (1 - t) * 0.75)
      .strokeCircle(x, y, calm ? 14 : 6 + 22 * t);
    if (!calm)
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        this.response
          .fillStyle(light ? 0xffdea2 : 0xeaf3f4, 1 - t)
          .fillCircle(x + Math.cos(angle) * t * 28, y + Math.sin(angle) * t * 28, 2);
      }
  }
  destroy(): void {
    this.background.destroy();
    this.lights.destroy();
    this.response.destroy();
    this.santa.destroy();
  }
}
