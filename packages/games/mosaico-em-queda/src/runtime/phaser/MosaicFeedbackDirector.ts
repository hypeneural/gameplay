import type { Haptics } from '@christmas-games/platform';
import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';
import type { MosaicBoardPresentation } from './MosaicBoardPresentation.js';

/** Bridges semantic effects to local tactile/visual acknowledgement only. */
export class MosaicFeedbackDirector {
  constructor(
    private readonly board: MosaicBoardPresentation,
    private readonly haptics: Haptics,
  ) {}

  consume(effects: readonly MosaicExperienceEffect[]): void {
    this.board.consume(effects);
    if (effects.some((effect) => effect.type === 'lines-cleared')) void this.impact('medium');
    else if (effects.some((effect) => effect.type === 'piece-locked')) void this.impact('light');
    else if (effects.some((effect) => effect.type === 'piece-rotated')) void this.impact('light');
  }

  private async impact(style: 'light' | 'medium'): Promise<void> {
    try {
      await this.haptics.impact(style);
    } catch {
      // Haptics are optional and unavailable in many desktop/mobile contexts.
    }
  }
}
