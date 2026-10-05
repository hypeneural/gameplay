import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import type { SnowTurbulenceModel } from '../../domain/SnowTurbulenceModel.js';
import type { GloboLayoutManager } from '../GloboLayoutManager.js';
import { globoArtKey } from './GloboProceduralArt.js';

interface ParticleSprite {
  sprite: Phaser.GameObjects.Image;
  id: number;
}

export class SnowParticleSystem {
  private readonly sprites: ParticleSprite[] = [];

  constructor(
    scene: Phaser.Scene,
    scope: SceneScope,
    private readonly model: SnowTurbulenceModel,
    private readonly count: number,
  ) {
    const activeCount = Math.min(count, this.model.particles.length);

    for (let i = 0; i < activeCount; i++) {
      const p = this.model.particles[i]!;
      const key = p.isGoldStar ? globoArtKey('star-sparkle') : globoArtKey('snow-powder');

      // Optical depth mapping:
      // background: depth 3 (behind photo diorama)
      // mid: depth 12 (in front of photo, behind steam mask)
      // foreground: depth 22 (in front of steam mask, right behind glass dome)
      const depth = p.depthLayer === 'background' ? 3 : p.depthLayer === 'mid' ? 12 : 22;
      const alpha =
        p.depthLayer === 'background'
          ? p.isGoldStar
            ? 0.85
            : 0.52
          : p.depthLayer === 'mid'
            ? p.isGoldStar
              ? 0.95
              : 0.85
            : p.isGoldStar
              ? 1.0
              : 0.75;

      const sprite = scene.add.image(0, 0, key).setDepth(depth).setScale(p.scale).setAlpha(alpha);

      this.sprites.push({ sprite, id: p.id });
      scope.add(() => sprite.destroy());
    }
  }

  update(layout: GloboLayoutManager): void {
    const dome = layout.dome;
    const activeCount = this.sprites.length;

    for (let i = 0; i < activeCount; i++) {
      const entry = this.sprites[i]!;
      const p = this.model.particles[entry.id]!;

      // Map normalized (0..1) coordinates centered at (0.5, 0.5) to dome pixels
      const screenX = dome.x + (p.x - 0.5) * dome.diameter;
      const screenY = dome.y + (p.y - 0.5) * dome.diameter;

      entry.sprite.setPosition(screenX, screenY);
      if (p.isGoldStar) {
        entry.sprite.setRotation(entry.sprite.rotation + 0.02);
      }
    }
  }

  swirl(normX: number, normY: number, impulseX: number, impulseY: number): void {
    this.model.applyVortex(normX, normY, impulseX, impulseY, 0.35);
  }

  setPaused(paused: boolean): void {
    for (const s of this.sprites) {
      s.sprite.setVisible(!paused);
    }
  }
}
