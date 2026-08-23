import type { QualityProfile } from '../phaser/quality.js';

export type ParticleKind =
  'none' | 'sparkle-tap' | 'sparkle-correct' | 'sparkle-hint' | 'sparkle-win';

export interface ParticleBurst {
  count: number;
  kind: ParticleKind;
  lifetimeMs: number;
}

/** Feedback is finite; ambient snow is deliberately a separate concern. */
export function feedbackBurst(
  kind: Exclude<ParticleKind, 'none'>,
  quality: QualityProfile,
): ParticleBurst | undefined {
  if (quality === 'LOW') {
    const lowCounts = {
      'sparkle-tap': 2,
      'sparkle-correct': 4,
      'sparkle-hint': 2,
      'sparkle-win': 6,
    };
    return { kind, count: lowCounts[kind], lifetimeMs: 260 };
  }
  if (quality === 'NORMAL') {
    const normalCounts = {
      'sparkle-tap': 4,
      'sparkle-correct': 8,
      'sparkle-hint': 4,
      'sparkle-win': 16,
    };
    return { kind, count: normalCounts[kind], lifetimeMs: 420 };
  }
  const highCounts = {
    'sparkle-tap': 8,
    'sparkle-correct': 12,
    'sparkle-hint': 8,
    'sparkle-win': 20,
  };
  return { kind, count: highCounts[kind], lifetimeMs: 500 };
}
