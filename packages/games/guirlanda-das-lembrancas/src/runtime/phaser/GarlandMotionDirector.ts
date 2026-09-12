import type * as Phaser from 'phaser';

export const garlandMotion = {
  press: 90,
  pickup: 120,
  arrival: 320,
  snap: 180,
  settle: 110,
  return: 190,
  lightTravel: 360,
  victory: 1450,
} as const;

/** Owns only active timelines; completed tweens are not retained for the whole round. */
export class GarlandMotionDirector {
  private readonly active = new Set<Phaser.Tweens.Tween>();
  constructor(
    private readonly manager: Phaser.Tweens.TweenManager,
    private readonly reduced: boolean,
  ) {}

  add(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const tween = this.manager.add(
      this.reduced ? { ...config, duration: 1, delay: 0, hold: 0, repeat: 0, yoyo: false } : config,
    );
    this.active.add(tween);
    const release = (): void => {
      this.active.delete(tween);
    };
    tween.once('complete', release);
    tween.once('stop', release);
    return tween;
  }

  stopTarget(target: object): void {
    for (const tween of this.active)
      if (tween.hasTarget(target)) {
        this.active.delete(tween);
        tween.stop();
      }
  }

  cancel(): void {
    for (const tween of [...this.active]) tween.stop();
    this.active.clear();
  }
}
