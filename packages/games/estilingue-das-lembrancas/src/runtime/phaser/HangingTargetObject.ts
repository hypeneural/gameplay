import type * as PhaserModule from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import type { TargetId } from '../../domain/TargetProgress.js';
import { estilingueDasLembrancasTuning as tuning } from '../../tuning.js';
import { EstilingueCollisionCategory } from './CollisionCategories.js';

interface TargetMaterialConfig {
  color: number;
  strokeColor: number;
  label: string;
}

const MATERIAL_PRESETS: Record<TargetId, TargetMaterialConfig> = {
  'wood-square': { color: 0x8b5a2b, strokeColor: 0xd4af37, label: '★' },
  gingerbread: { color: 0xc68a4c, strokeColor: 0xffffff, label: '웃' },
  'gold-star': { color: 0xd4af37, strokeColor: 0xfff3a8, label: '★' },
  'round-bauble': { color: 0xb22222, strokeColor: 0xd4af37, label: '🔔' },
};

const TARGET_TEXTURES: Record<TargetId, string> = {
  'wood-square': 'alvo-wood-square',
  gingerbread: 'alvo-gingerbread',
  'gold-star': 'alvo-gold-star',
  'round-bauble': 'alvo-round-bauble',
};

export class HangingTargetObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public body: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constraint: any = null;
  private ropeGraphics: PhaserModule.GameObjects.Graphics;
  private container: PhaserModule.GameObjects.Container;
  private targetArt?: PhaserModule.GameObjects.Image;
  private targetBg?: PhaserModule.GameObjects.Arc;
  private targetRing?: PhaserModule.GameObjects.Arc;
  private targetCenter?: PhaserModule.GameObjects.Arc;
  private targetLabel?: PhaserModule.GameObjects.Text;
  private completedGlow: PhaserModule.GameObjects.Arc;
  private isCompleted = false;

  constructor(
    private readonly scene: PhaserModule.Scene,
    private readonly scope: SceneScope,
    public readonly id: TargetId,
    public readonly anchorX: number,
    public readonly anchorY: number,
    public readonly targetX: number,
    public readonly targetY: number,
    public readonly radius: number,
  ) {
    this.ropeGraphics = this.scene.add.graphics().setDepth(7);

    this.completedGlow = this.scene.add.circle(0, 0, radius + 8, 0xffd700, 0.35).setVisible(false);

    const children: PhaserModule.GameObjects.GameObject[] = [this.completedGlow];
    const texKey = TARGET_TEXTURES[id];

    if (this.scene.textures.exists(texKey)) {
      this.targetArt = this.scene.add
        .image(0, 0, texKey)
        .setDisplaySize(radius * 2.2, radius * 2.2);
      children.push(this.targetArt);
    } else {
      const preset = MATERIAL_PRESETS[id];
      this.targetBg = this.scene.add.circle(0, 0, radius, preset.color);
      this.targetRing = this.scene.add.circle(0, 0, radius * 0.65, 0xffffff);
      this.targetCenter = this.scene.add.circle(0, 0, radius * 0.35, 0xb22222);
      this.targetLabel = this.scene.add
        .text(0, -radius * 0.75, preset.label, {
          fontSize: '14px',
          color: '#ffd700',
        })
        .setOrigin(0.5);
      children.push(this.targetBg, this.targetRing, this.targetCenter, this.targetLabel);
    }

    this.container = this.scene.add.container(targetX, targetY, children);
    this.container.setDepth(8);

    this.scope.add(() => this.destroy());
    this.createPhysics();
  }

  private createPhysics(): void {
    if (!this.scene.matter) return;

    // Dynamic circular target body matching full visual ornament bounds
    const physicsRadius = Math.round(this.radius * 1.18);
    this.body = this.scene.matter.add.circle(this.targetX, this.targetY, physicsRadius, {
      mass: 2.5,
      frictionAir: 0.02,
      restitution: 0.4,
      label: `target-${this.id}`,
      collisionFilter: {
        category: EstilingueCollisionCategory.TARGET,
        mask: EstilingueCollisionCategory.SNOWBALL,
      },
    });

    // Pendulum constraint linking static anchor point to the swinging target body
    const dist = Math.hypot(this.targetX - this.anchorX, this.targetY - this.anchorY);
    this.constraint = this.scene.matter.add.worldConstraint(
      this.body,
      dist,
      tuning.targetConstraintStiffness,
      {
        pointA: { x: this.anchorX, y: this.anchorY },
        pointB: { x: 0, y: -this.radius * 0.8 },
        damping: tuning.targetAngularDamping,
      },
    );
  }

  markCompleted(): void {
    this.isCompleted = true;
    this.completedGlow.setVisible(true);
    this.scene.tweens.add({
      targets: this.completedGlow,
      alpha: { from: 0.6, to: 0.2 },
      scale: { from: 1.1, to: 1.25 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update(): void {
    if (!this.body) return;

    const bx = this.body.position.x;
    const by = this.body.position.y;
    const angle = this.body.angle;

    this.container.setPosition(bx, by);
    this.container.setRotation(angle);

    // Redraw hanging cord
    this.ropeGraphics.clear();
    this.ropeGraphics.lineStyle(2, 0x5a3d28, 0.85);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(this.anchorX, this.anchorY);
    this.ropeGraphics.lineTo(bx, by - this.radius * 0.8);
    this.ropeGraphics.strokePath();

    // Small holly berry pin at anchor
    this.ropeGraphics.fillStyle(0xb22222, 0.9);
    this.ropeGraphics.fillCircle(this.anchorX, this.anchorY, 3.5);
  }

  get completed(): boolean {
    return this.isCompleted;
  }

  applyImpactImpulse(vx: number, vy: number): void {
    if (this.body && this.scene.matter) {
      this.scene.matter.body.applyForce(this.body, this.body.position, {
        x: vx * 0.005,
        y: vy * 0.005,
      });
      const angVel = (vx >= 0 ? 0.06 : -0.06) * Math.min(2.0, Math.hypot(vx, vy) / 6);
      this.scene.matter.body.setAngularVelocity(this.body, angVel);
    }
  }

  destroy(): void {
    if (this.constraint && this.scene.matter) {
      this.scene.matter.world.remove(this.constraint);
      this.constraint = null;
    }
    if (this.body && this.scene.matter) {
      this.scene.matter.world.remove(this.body);
      this.body = null;
    }
    this.ropeGraphics.destroy();
    this.container.destroy();
  }
}
