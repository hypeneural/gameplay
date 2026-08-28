import { HapticFeedback } from '@christmas-games/platform';
import type { Haptics, QualityTier, Random, SceneScope } from '@christmas-games/platform';
import { createChristmasEffects, christmasTheme } from '@christmas-games/theme';
import type { FeedbackDirector } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';

interface PuzzleFeedbackInput {
  scene: PhaserModule.Scene;
  scope: SceneScope;
  random: Random;
  haptics: Haptics;
  quality: QualityTier;
  reducedMotion: boolean;
  playSound(cue: string): void;
}

export function createPuzzleFeedbackDirector(
  input: PuzzleFeedbackInput,
): FeedbackDirector<PhaserModule.GameObjects.Rectangle> {
  const haptics = new HapticFeedback(input.haptics);
  return createChristmasEffects(
    {
      quality: input.quality,
      motion: input.reducedMotion ? 'reduced' : 'full',
      soundEnabled: true,
    },
    {
      animate: (target, instruction): void => {
        if (!target.active) return;
        const scale = instruction.motion.scale ?? 1;
        input.scope.resource(
          input.scene.tweens.add({
            targets: target,
            scaleX: scale,
            scaleY: scale,
            duration: instruction.motion.durationMs,
            ease: instruction.motion.easing,
            yoyo: scale !== 1,
          }),
        );
      },
      emitParticles: (target, instruction): void => {
        if (!instruction.particles) return;
        emitPuzzleSparkles(
          input.scene,
          input.scope,
          input.random,
          target.x,
          target.y,
          instruction.particles.count,
          instruction.particles.lifetimeMs,
        );
      },
      haptic: (cue) => haptics.cue(cue),
      playSound: input.playSound,
    },
  );
}

/** Finite, scene-scoped sparkles used after the primary move feedback. */
export function emitPuzzleSparkles(
  scene: PhaserModule.Scene,
  scope: SceneScope,
  random: Random,
  x: number,
  y: number,
  count: number,
  lifetimeMs: number,
): void {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const distance = 18 + random.next() * 28;
    const sparkle = scene.add
      .text(x, y, '✦', {
        color: index % 2 === 0 ? christmasTheme.color.gold : christmasTheme.color.snow,
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
      })
      .setOrigin(0.5)
      .setDepth(10);
    scope.add(() => sparkle.destroy());
    scope.resource(
      scene.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 1.45,
        scaleY: 1.45,
        duration: lifetimeMs,
        ease: 'Cubic.easeOut',
        onComplete: () => sparkle.destroy(),
      }),
    );
  }
}
