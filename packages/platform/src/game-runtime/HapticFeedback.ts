import type { Haptics } from '../contracts/index.js';

export type HapticCue = 'tap' | 'correct' | 'celebrate' | 'error';

const cueToImpact: Record<HapticCue, 'light' | 'medium' | 'heavy'> = {
  tap: 'light',
  correct: 'medium',
  celebrate: 'heavy',
  error: 'medium',
};

/** Shared feedback language for games; a platform adapter may map it to vibration/native haptics. */
export class HapticFeedback {
  constructor(private readonly haptics: Haptics) {}

  async cue(cue: HapticCue): Promise<void> {
    await this.haptics.impact(cueToImpact[cue]);
  }
}
