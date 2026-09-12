import type * as Phaser from 'phaser';
import type { QualityTier } from '@christmas-games/platform';
import type { Point } from '../../domain/PhotoGeometry.js';
import type { MagicEffect } from '../../domain/Hotspots.js';
import type { PhotoLayoutManager } from '../PhotoLayoutManager.js';
import { artKey } from './ProceduralArt.js';

/** Fixed emitters and reusable accents: bounded particles, no sprite churn per move. */
export class FXManager {
  private readonly stars: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly snow: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly shards: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly hat: Phaser.GameObjects.Image;
  private readonly finalStar: Phaser.GameObjects.Image;
  private readonly border: Phaser.GameObjects.Graphics;
  private lastTrail: Point | undefined;
  private accentAt = -10000;
  private accent: MagicEffect = 'star';
  private accentPosition: Point = { x: 0, y: 0 };
  private readonly factor: number;

  constructor(
    scene: Phaser.Scene,
    quality: QualityTier,
    private readonly reduced: boolean,
  ) {
    this.factor = reduced ? 0.16 : quality === 'LOW' ? 0.35 : quality === 'HIGH' ? 1 : 0.65;
    const emitter = (key: string, max: number, speed: number) =>
      scene.add
        .particles(0, 0, artKey(key), {
          emitting: false,
          lifespan: { min: 280, max: 600 },
          speed: { min: speed / 3, max: speed },
          alpha: { start: 0.95, end: 0 },
          scale: { start: 0.42, end: 0.08 },
          maxAliveParticles: Math.round(max * this.factor),
          maxParticles: Math.round(max * this.factor),
          reserve: Math.round(max * this.factor),
        })
        .setDepth(10);
    this.stars = emitter('spark', 90, 90);
    this.snow = emitter('powder', 60, 55);
    this.shards = emitter('shard', 18, 120);
    this.shards.setParticleGravity(0, 150).setParticleLifespan(1050);
    this.shards.updateConfig({ scale: { start: 0.7, end: 0.12 } });
    this.ring = scene.add
      .circle(0, 0, 18)
      .setStrokeStyle(2, 0xffd788)
      .setDepth(10)
      .setVisible(false);
    this.hat = scene.add
      .image(0, 0, artKey('hat'))
      .setDisplaySize(50, 45)
      .setDepth(11)
      .setVisible(false);
    this.finalStar = scene.add.image(0, 0, artKey('spark')).setDepth(2).setVisible(false);
    this.border = scene.add.graphics().setDepth(9);
  }

  sparkleBurst(point: Point, count = 10): void {
    this.stars.explode(Math.max(2, Math.round(count * this.factor)), point.x, point.y);
  }
  magicTrail(point: Point, velocity: number): void {
    if (this.lastTrail && Math.hypot(point.x - this.lastTrail.x, point.y - this.lastTrail.y) < 12)
      return;
    this.lastTrail = { ...point };
    this.stars.setParticleSpeed(this.reduced ? 0 : Math.min(75, 18 + velocity * 0.1));
    this.sparkleBurst(point, 4);
  }
  resetTrail(): void {
    this.lastTrail = undefined;
  }

  found(effect: MagicEffect, point: Point, now: number): void {
    this.accent = effect;
    this.accentAt = now;
    this.accentPosition = point;
    if (effect === 'snow')
      this.snow.explode(Math.max(3, Math.round(16 * this.factor)), point.x, point.y);
    else this.sparkleBurst(point, effect === 'wonder' ? 20 : 16);
  }

  iceDust(point: Point): void {
    this.snow.explode(Math.max(1, Math.round(4 * this.factor)), point.x, point.y);
  }
  iceExplosion(layout: PhotoLayoutManager): void {
    const p = layout.photo;
    const count = Math.round(18 * this.factor);
    for (let i = 0; i < count; i++) {
      const left = i % 2 === 0;
      this.shards.explode(1, left ? p.x : p.x + p.width, p.y + (p.height * i) / count);
    }
  }

  update(
    now: number,
    layout: PhotoLayoutManager,
    finaleMs: number | undefined,
    hero: boolean,
  ): void {
    const t = (now - this.accentAt) / 650;
    const active = t >= 0 && t < 1;
    this.ring
      .setVisible(active && this.accent !== 'santa')
      .setPosition(this.accentPosition.x, this.accentPosition.y)
      .setScale(1 + (this.reduced ? 0 : t * 2))
      .setAlpha(1 - t);
    this.hat
      .setVisible(active && this.accent === 'santa')
      .setPosition(this.accentPosition.x, this.accentPosition.y - 22)
      .setAlpha(1 - t);
    this.border.clear();
    const p = layout.photo;
    if ((active && this.accent === 'lights') || finaleMs !== undefined || hero) {
      this.border.lineStyle(hero ? 2 : 3, 0xffd47b, hero ? 0.55 : 0.9);
      this.border.strokeRoundedRect(p.x - 6, p.y - 6, p.width + 12, p.height + 12, 8);
      for (let i = 0; i < 12; i++) {
        this.border.fillStyle(0xffecb9, hero ? 0.65 : 1);
        this.border.fillCircle(p.x + (p.width * i) / 11, p.y - 8, 2.5);
        this.border.fillCircle(p.x + (p.width * i) / 11, p.y + p.height + 8, 2.5);
      }
    }
    this.finalStar.setVisible(finaleMs !== undefined && !this.reduced);
    if (finaleMs !== undefined && !this.reduced) {
      const fraction = Math.min(1, finaleMs / 1000);
      const x = -30 + (layout.width + 60) * fraction;
      const y = layout.height * (0.87 - 0.75 * fraction);
      this.finalStar
        .setPosition(x, y)
        .setScale(2.2)
        .setAngle(fraction * 180);
      // The streak stays behind the opaque photo throughout its diagonal.
      this.stars.setDepth(2);
      this.magicTrail({ x, y }, 180);
    } else this.stars.setDepth(10);
  }

  setPaused(paused: boolean): void {
    for (const emitter of [this.stars, this.snow, this.shards]) {
      if (paused) emitter.pause();
      else emitter.resume();
    }
  }

  clear(): void {
    this.stars.killAll();
    this.snow.killAll();
    this.shards.killAll();
    this.accentAt = -10000;
    this.resetTrail();
  }
}
