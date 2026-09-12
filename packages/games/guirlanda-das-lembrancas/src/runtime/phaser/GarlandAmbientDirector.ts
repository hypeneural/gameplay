import type * as Phaser from 'phaser';

/** Six background flakes and one practical light. No foreground emitter or frame loop. */
export class GarlandAmbientDirector {
  private readonly flakes: Phaser.GameObjects.Arc[];
  private readonly tweens = new Set<Phaser.Tweens.Tween>();
  private width = 1;
  private height = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly boxLight: Phaser.GameObjects.Ellipse,
  ) {
    this.flakes = Array.from({ length: 6 }, (_, index) =>
      scene.add
        .circle(0, 0, index % 2 ? 1.2 : 1.7, 0xdce8ed, 0.28)
        .setDepth(-17)
        .setName('garland-background-snow')
        .setVisible(false),
    );
  }

  layout(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  start(): void {
    this.stop();
    const xRatios = [0.035, 0.94, 0.11, 0.87, 0.06, 0.96];
    this.flakes.forEach((flake, index) => {
      flake
        .setPosition(this.width * xRatios[index]!, this.height * (index / 7) - 20)
        .setVisible(true);
      this.tweens.add(
        this.scene.tweens.add({
          targets: flake,
          y: this.height + 20,
          duration: 10000 + index * 1300,
          repeat: -1,
          ease: 'Linear',
        }),
      );
    });
    this.boxLight.setScale(1);
    this.tweens.add(
      this.scene.tweens.add({
        targets: this.boxLight,
        scaleX: 1.035,
        duration: 2400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
    );
  }

  stop(): void {
    for (const tween of this.tweens) tween.stop();
    this.tweens.clear();
    for (const flake of this.flakes) flake.setVisible(false);
  }

  destroy(): void {
    this.stop();
    for (const flake of this.flakes) flake.destroy();
  }
}
