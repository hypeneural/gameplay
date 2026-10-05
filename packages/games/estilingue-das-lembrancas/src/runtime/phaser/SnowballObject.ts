import type * as PhaserModule from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import { estilingueDasLembrancasTuning as tuning } from '../../tuning.js';
import { calculateSquashStretch } from '../../domain/ShotModel.js';
import { EstilingueCollisionCategory } from './CollisionCategories.js';

export class SnowballObject {
  private sprite: PhaserModule.GameObjects.Arc | PhaserModule.GameObjects.Image;
  private glowSprite: PhaserModule.GameObjects.Arc;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private body: any = null;
  private inFlight = false;
  private initialY = 0;
  private flightDurationMs = 0;
  private lastPuffX = 0;
  private lastPuffY = 0;
  private trailEmitter?: PhaserModule.GameObjects.Particles.ParticleEmitter | undefined;

  constructor(
    private readonly scene: PhaserModule.Scene,
    private readonly scope: SceneScope,
    public x: number,
    public y: number,
    public readonly radius = tuning.snowballRadius,
  ) {
    this.initialY = y;
    this.lastPuffX = x;
    this.lastPuffY = y;

    // Glowing halo for mobile high-contrast visibility against all backgrounds
    this.glowSprite = this.scene.add
      .circle(x, y, radius * 1.35, 0xd8f0ff, 0.45)
      .setDepth(31)
      .setVisible(false);

    // Use shaded 3D snowball texture from procedural art if available
    const texKey = 'estilingue-art-snowball';
    if (this.scene.textures.exists(texKey)) {
      this.sprite = this.scene.add
        .image(x, y, texKey)
        .setDisplaySize(radius * 2.2, radius * 2.2)
        .setDepth(32);
    } else {
      this.sprite = this.scene.add
        .circle(x, y, radius, 0xffffff)
        .setDepth(32)
        .setStrokeStyle(2, 0xd0e8ff, 0.7);
    }

    // High-density sparkle & ice-dust trail following snowball flight
    const particleKey = 'estilingue-art-snow-particle';
    if (this.scene.textures.exists(particleKey)) {
      this.trailEmitter = this.scene.add.particles(0, 0, particleKey, {
        lifespan: 550,
        scale: { start: 0.45, end: 0.05 },
        alpha: { start: 0.95, end: 0 },
        speed: { min: 8, max: 32 },
        frequency: 18,
        emitting: false,
        blendMode: 'ADD',
      });
      this.trailEmitter.setDepth(29);
      this.scope.add(() => this.trailEmitter?.destroy());
    }

    this.scope.add(() => {
      this.glowSprite.destroy();
      this.destroy();
    });
    this.createMatterBody(x, y);
  }

  private createMatterBody(x: number, y: number): void {
    if (!this.scene.matter) return;

    // Create Matter body with mass, then set static for slingshot pouch rest
    this.body = this.scene.matter.add.circle(x, y, this.radius, {
      mass: tuning.snowballMass,
      frictionAir: tuning.snowballFrictionAir,
      restitution: tuning.snowballRestitution,
      label: 'snowball',
      collisionFilter: {
        category: EstilingueCollisionCategory.SNOWBALL,
        mask: EstilingueCollisionCategory.TARGET | EstilingueCollisionCategory.BOUNDARY,
      },
    });
    this.scene.matter.body.setStatic(this.body, true);
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.sprite.setPosition(x, y);
    this.glowSprite.setPosition(x, y);
    if (this.body && !this.inFlight) {
      this.scene.matter.body.setPosition(this.body, { x, y });
    }
  }

  setVisible(value: boolean): void {
    this.sprite.setVisible(value);
    if (!value) {
      this.glowSprite.setVisible(false);
    }
  }

  get isInFlight(): boolean {
    return this.inFlight;
  }

  get flightTimeMs(): number {
    return this.flightDurationMs;
  }

  launch(velocityX: number, velocityY: number): void {
    if (!this.body || this.inFlight) return;

    this.inFlight = true;
    this.flightDurationMs = 0;
    this.initialY = this.sprite.y;
    this.lastPuffX = this.sprite.x;
    this.lastPuffY = this.sprite.y;

    this.sprite.setDepth(32);
    this.sprite.setVisible(true);

    this.glowSprite.setPosition(this.sprite.x, this.sprite.y);
    this.glowSprite.setVisible(true);

    // 1. Wake up Matter body and make dynamic with clean mass
    this.scene.matter.body.setStatic(this.body, false);
    this.scene.matter.body.setMass(this.body, tuning.snowballMass);
    this.scene.matter.body.setVelocity(this.body, { x: velocityX, y: velocityY });

    // Ensure body is awake in flight
    if (this.body) {
      this.body.isSleeping = false;
      this.body.sleepThreshold = 240;
    }

    // 2. Start gentle sparkle trail
    if (this.trailEmitter) {
      this.trailEmitter.start();
    }

    // 3. Directional Squash & Stretch
    const angle = Math.atan2(velocityY, velocityX);
    const stretch = calculateSquashStretch(angle, tuning.squashStretchFactor);

    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: stretch.scaleX,
      scaleY: stretch.scaleY,
      duration: tuning.squashStretchDurationMs,
      yoyo: true,
      ease: 'Power2',
    });
  }

  update(deltaMs = 16.666): void {
    if (!this.inFlight || !this.body) return;

    this.flightDurationMs += deltaMs;
    const bx = this.body.position.x;
    const by = this.body.position.y;

    this.sprite.setPosition(bx, by);
    this.glowSprite.setPosition(bx, by);
    this.x = bx;
    this.y = by;

    // Trail particles follow snowball
    if (this.trailEmitter) {
      this.trailEmitter.setPosition(bx, by);
    }

    // Drop periodic lingering trajectory snow cloud puffs (Angry Birds / Aliens style)
    const distFromLastPuff = Math.hypot(bx - this.lastPuffX, by - this.lastPuffY);
    if (distFromLastPuff >= 24) {
      this.lastPuffX = bx;
      this.lastPuffY = by;
      const puff = this.scene.add.circle(bx, by, this.radius * 0.38, 0xffffff, 0.72).setDepth(30);
      this.scene.tweens.add({
        targets: puff,
        scale: 1.4,
        alpha: 0,
        duration: 550,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    }

    // Flight rotation oriented by velocity vector tangent
    if (this.body.velocity && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
      const angle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
      this.sprite.setRotation(angle);
    }

    // Pseudo-3D depth scaling: as snowball travels upwards towards wall/targets, scale 1.0 -> 0.84
    const progress = Math.max(0, Math.min(1.0, (this.initialY - this.y) / (this.initialY * 0.7)));
    const targetScale = 1.0 - progress * 0.16;
    this.sprite.setScale(targetScale);
    this.glowSprite.setScale(targetScale);
  }

  explode(): void {
    if (!this.inFlight) return;
    this.inFlight = false;

    if (this.trailEmitter) {
      this.trailEmitter.stop();
    }

    // Spawn glorious radial burst of fluffy snow particles
    const particleKey = 'estilingue-art-snow-particle';
    if (this.scene.textures.exists(particleKey)) {
      this.scene.add.particles(this.x, this.y, particleKey, {
        speed: { min: 40, max: 150 },
        gravityY: 120,
        scale: { start: 0.6, end: 0.1 },
        alpha: { start: 1.0, end: 0 },
        lifespan: 550,
        maxParticles: 24,
        blendMode: 'ADD',
      });
    }

    // Freeze body and hide sprite immediately
    this.sprite.setVisible(false);
    this.glowSprite.setVisible(false);
    if (this.body) {
      this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
      this.scene.matter.body.setStatic(this.body, true);
    }
  }

  reset(restX: number, restY: number): void {
    this.inFlight = false;
    this.flightDurationMs = 0;
    this.initialY = restY;
    this.lastPuffX = restX;
    this.lastPuffY = restY;
    this.sprite.setScale(0);
    this.sprite.setRotation(0);
    this.sprite.setDepth(24);
    this.sprite.setVisible(true);
    this.glowSprite.setVisible(false);

    // Magical snowball pop-in animation
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 1.0,
      duration: 250,
      ease: 'Back.easeOut',
    });

    if (this.trailEmitter) {
      this.trailEmitter.stop();
    }

    if (this.body) {
      this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
      this.scene.matter.body.setAngularVelocity(this.body, 0);
      this.scene.matter.body.setPosition(this.body, { x: restX, y: restY });
      this.scene.matter.body.setStatic(this.body, true);
    }
    this.setPosition(restX, restY);
  }

  destroy(): void {
    if (this.trailEmitter) {
      this.trailEmitter.destroy();
      this.trailEmitter = undefined;
    }
    if (this.body && this.scene.matter) {
      this.scene.matter.world.remove(this.body);
      this.body = null;
    }
    this.glowSprite.destroy();
    this.sprite.destroy();
  }
}
