import type { QualityProfile } from '../phaser/quality.js';
import { motionToken } from './MotionTokens.js';
import type { MotionToken } from './MotionTokens.js';
import type { MotionPreference } from './MotionPreference.js';
import { feedbackBurst } from './ParticlePresets.js';
import type { ParticleBurst } from './ParticlePresets.js';
import { sfxCueByFeedback } from './SfxCues.js';
import type { FeedbackCue } from './SfxCues.js';

export interface EffectPolicyOptions {
  motion: MotionPreference;
  quality: QualityProfile;
  soundEnabled: boolean;
}

export interface FeedbackInstruction {
  cue: FeedbackCue;
  haptic: 'tap' | 'correct' | 'celebrate' | 'error';
  motion: MotionToken;
  particles?: ParticleBurst;
  soundCue?: string;
}

const motionByCue: Record<FeedbackCue, Parameters<typeof motionToken>[0]> = {
  tap: 'press',
  select: 'select',
  correct: 'swap',
  wrong: 'press',
  hint: 'reveal',
  celebrate: 'celebrate',
};

const particleByCue: Partial<Record<FeedbackCue, Parameters<typeof feedbackBurst>[0]>> = {
  tap: 'sparkle-tap',
  correct: 'sparkle-correct',
  hint: 'sparkle-hint',
  celebrate: 'sparkle-win',
};

const hapticByCue: Record<FeedbackCue, FeedbackInstruction['haptic']> = {
  tap: 'tap',
  select: 'tap',
  correct: 'correct',
  wrong: 'error',
  hint: 'tap',
  celebrate: 'celebrate',
};

/** Resolves quality and accessibility in one named policy instead of in every scene. */
export function resolveFeedback(
  cue: FeedbackCue,
  options: EffectPolicyOptions,
): FeedbackInstruction {
  const particleKind = particleByCue[cue];
  const instruction: FeedbackInstruction = {
    cue,
    haptic: hapticByCue[cue],
    motion: motionToken(motionByCue[cue], options.motion),
  };
  if (options.motion !== 'reduced' && particleKind) {
    const particles = feedbackBurst(particleKind, options.quality);
    if (particles) instruction.particles = particles;
  }
  if (options.soundEnabled) instruction.soundCue = sfxCueByFeedback[cue];
  return instruction;
}
