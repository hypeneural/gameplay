import type { MotionPreference } from './MotionPreference.js';

export type MotionName = 'press' | 'select' | 'swap' | 'flip' | 'modal' | 'reveal' | 'celebrate';

export interface MotionToken {
  durationMs: number;
  easing: 'Cubic.easeOut' | 'Sine.easeInOut' | 'Back.easeOut';
  scale?: number;
}

const fullMotionTokens: Record<MotionName, MotionToken> = {
  press: { durationMs: 100, easing: 'Cubic.easeOut', scale: 0.98 },
  select: { durationMs: 120, easing: 'Cubic.easeOut', scale: 1.03 },
  swap: { durationMs: 160, easing: 'Sine.easeInOut' },
  flip: { durationMs: 240, easing: 'Sine.easeInOut' },
  modal: { durationMs: 210, easing: 'Cubic.easeOut' },
  reveal: { durationMs: 360, easing: 'Sine.easeInOut' },
  celebrate: { durationMs: 1400, easing: 'Back.easeOut', scale: 1.04 },
};

/** Resolves short confirmation motion; reduced mode never returns an oscillating loop. */
export function motionToken(name: MotionName, preference: MotionPreference): MotionToken {
  const token = fullMotionTokens[name];
  if (preference === 'full') return token;
  const reduced: MotionToken = {
    ...token,
    durationMs: Math.min(token.durationMs, 120),
    easing: 'Cubic.easeOut',
  };
  if (name !== 'press') delete reduced.scale;
  return reduced;
}

export { fullMotionTokens as motionTokens };
