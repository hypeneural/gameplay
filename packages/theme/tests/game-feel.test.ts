import { describe, expect, it, vi } from 'vitest';
import { FeedbackDirector, childTouchProfile, resolveFeedback } from '../src/index.js';

describe('game feel policy', () => {
  it('keeps LOW feedback finite and removes particles for reduced motion', () => {
    expect(
      resolveFeedback('correct', { quality: 'LOW', motion: 'full', soundEnabled: true }),
    ).toMatchObject({
      haptic: 'correct',
      particles: { count: 4, kind: 'sparkle-correct' },
      soundCue: 'feedback.correct',
    });
    const reducedCelebration = resolveFeedback('celebrate', {
      quality: 'NORMAL',
      motion: 'reduced',
      soundEnabled: true,
    });
    expect(reducedCelebration).toMatchObject({
      motion: { durationMs: 120, easing: 'Cubic.easeOut' },
      soundCue: 'christmas.win',
    });
    expect(reducedCelebration).not.toHaveProperty('particles');
  });

  it('keeps touch defaults explicit and sends one resolved cue through its injected port', () => {
    expect(childTouchProfile).toMatchObject({
      primaryTargetMinCssPx: 52,
      secondaryTargetMinCssPx: 44,
      dragDistanceThresholdPx: 16,
      idleAssistDelayMs: 7000,
    });
    const animate = vi.fn();
    const emitParticles = vi.fn();
    const playSound = vi.fn();
    const feel = new FeedbackDirector(
      { quality: 'NORMAL', motion: 'full', soundEnabled: true },
      { animate, emitParticles, playSound },
    );

    const instruction = feel.correct('piece-a');

    expect(instruction.cue).toBe('correct');
    expect(animate).toHaveBeenCalledWith('piece-a', instruction);
    expect(emitParticles).toHaveBeenCalledWith('piece-a', instruction);
    expect(playSound).toHaveBeenCalledWith('feedback.correct');
  });
});
