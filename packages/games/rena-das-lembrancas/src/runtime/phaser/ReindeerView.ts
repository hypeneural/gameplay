import type * as Phaser from 'phaser';

export const rudolphCharacterAssets = ['body', 'head', 'front-leg', 'back-leg'].map((part) => ({
  key: `rudolph-${part}-v1`,
  url: `/assets/rena-das-lembrancas/art/rudolph-${part}-v1.webp`,
}));

/** One reviewed plush model, with stable joint origins and no frame-to-frame redrawing. */
export class ReindeerView {
  readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Container;
  private readonly legs: Phaser.GameObjects.Image[] = [];
  private readonly noseLight: Phaser.GameObjects.Arc;
  private facing = 1;
  private stride = 0;

  constructor(scene: Phaser.Scene) {
    const shadow = scene.add.ellipse(-4, 0, 105, 15, 0x071621, 0.22);
    this.body = scene.add.container(0, 0);
    for (let i = 0; i < 4; i++) {
      const front = i % 2 === 1;
      const leg = scene.add
        .image(front ? 19 : -34, -39, `rudolph-${front ? 'front' : 'back'}-leg-v1`)
        .setOrigin(0.5, 0.12)
        .setDisplaySize(19, 47);
      if (i < 2) leg.setX(leg.x + 9).setTint(0xc9bbc0);
      this.legs.push(leg);
      this.body.add(leg);
    }
    this.body.add(scene.add.image(-9, -63, 'rudolph-body-v1').setDisplaySize(102, 68));
    this.head = scene.add.container(23, -82);
    this.noseLight = scene.add.circle(28, -16, 19, 0xffaf83, 0.08);
    this.head.add(this.noseLight);
    this.head.add(
      scene.add.image(0, 0, 'rudolph-head-v1').setOrigin(0.5, 0.92).setDisplaySize(72, 82),
    );
    this.body.add(this.head);
    this.root = scene.add.container(0, 0, [shadow, this.body]).setDepth(8);
  }

  render(
    x: number,
    ground: number,
    velocity: number,
    dt: number,
    reduced: boolean,
    magic: boolean,
    ready: boolean,
    caught: number,
  ): void {
    if (Math.abs(velocity) > 0.04) this.facing = velocity < 0 ? -1 : 1;
    this.stride += dt * Math.min(14, Math.abs(velocity) * 25);
    this.root.setPosition(x, ground);
    this.body.setScale(this.facing, 1);
    this.body.y = reduced
      ? 0
      : -Math.abs(Math.sin(this.stride)) * Math.min(3, Math.abs(velocity) * 8);
    this.legs.forEach((leg, i) =>
      leg.setAngle(
        reduced
          ? 0
          : Math.sin(this.stride + (i === 0 || i === 3 ? Math.PI : 0)) *
              Math.min(24, Math.abs(velocity) * 40),
      ),
    );
    this.head.setAngle(reduced ? 0 : -Math.sin(caught * Math.PI) * 10);
    this.noseLight.setAlpha(magic ? 0.6 : ready ? 0.3 : caught > 0 ? 0.35 : 0.08);
    this.noseLight.setScale(magic ? 1.3 : 1);
  }

  destroy(): void {
    this.root.destroy();
  }
  nearNose(x: number, y: number): boolean {
    return Math.hypot(x - this.nosePosition.x, y - this.nosePosition.y) < 29;
  }
  get nosePosition(): { x: number; y: number } {
    return { x: this.root.x + this.facing * 51, y: this.root.y - 98 };
  }
}
