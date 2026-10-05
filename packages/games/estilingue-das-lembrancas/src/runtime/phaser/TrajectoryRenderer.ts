import type * as PhaserModule from 'phaser';
import type { TrajectoryPoint } from './TrajectoryPredictor.js';

export class TrajectoryRenderer {
  private readonly graphics: PhaserModule.GameObjects.Graphics;
  private visible = false;

  constructor(
    private readonly scene: PhaserModule.Scene,
    depth = 0,
  ) {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(depth);
  }

  setVisible(value: boolean): void {
    this.visible = value;
    if (!value) {
      this.graphics.clear();
    }
  }

  render(points: TrajectoryPoint[], _powerRatio = 1.0): void {
    this.graphics.clear();
    if (!this.visible || points.length === 0) return;

    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;

    // Collect simulated trajectory points sequentially while inside playfield
    const visiblePoints: TrajectoryPoint[] = [];
    for (const p of points) {
      if (p.y > screenH + 30) break; // Floor reached
      if (p.x < -30 || p.x > screenW + 30) break; // Lateral boundaries reached
      if (p.y < -50) break; // Top ceiling reached
      visiblePoints.push(p);
    }

    if (visiblePoints.length === 0) return;

    for (let i = 0; i < visiblePoints.length; i++) {
      const p = visiblePoints[i]!;

      // 1. Dark contrast shadow ring (makes dots pop over bright tree lights & golden frame)
      this.graphics.fillStyle(0x1a0a04, 0.75);
      this.graphics.fillCircle(p.x, p.y, 6.5);

      // 2. Luminous golden border
      this.graphics.fillStyle(0xffd700, 0.95);
      this.graphics.fillCircle(p.x, p.y, 5.0);

      // 3. Crisp white snowball core
      this.graphics.fillStyle(0xffffff, 1.0);
      this.graphics.fillCircle(p.x, p.y, 3.5);
    }

    // Directional arrow at the apex or tip
    if (visiblePoints.length >= 2) {
      const last = visiblePoints[visiblePoints.length - 1]!;
      const prev = visiblePoints[visiblePoints.length - 2]!;
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

      const arrowSize = 13;
      const p1 = {
        x: last.x + Math.cos(angle) * arrowSize,
        y: last.y + Math.sin(angle) * arrowSize,
      };
      const p2 = {
        x: last.x + Math.cos(angle + 2.4) * (arrowSize * 0.75),
        y: last.y + Math.sin(angle + 2.4) * (arrowSize * 0.75),
      };
      const p3 = {
        x: last.x + Math.cos(angle - 2.4) * (arrowSize * 0.75),
        y: last.y + Math.sin(angle - 2.4) * (arrowSize * 0.75),
      };

      // Golden arrow with soft glow
      this.graphics.fillStyle(0xffd700, 0.45);
      this.graphics.fillTriangle(
        p1.x + Math.cos(angle) * 2,
        p1.y + Math.sin(angle) * 2,
        p2.x,
        p2.y,
        p3.x,
        p3.y,
      );
      this.graphics.fillStyle(0xfff5c0, 0.95);
      this.graphics.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
