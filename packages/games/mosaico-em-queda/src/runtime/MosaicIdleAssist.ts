import type { MosaicExperienceState } from '../domain/MosaicExperience.js';
import { requestMosaicHint, type MosaicHint } from '../domain/MosaicHint.js';
import { mosaicoEmQuedaTuning } from '../tuning.js';

export const MOSAIC_IDLE_ASSIST_DELAY_TICKS = Math.round(
  (mosaicoEmQuedaTuning.idleAssistDelayMs / 1000) * 60,
);

/**
 * Turns the pure hint search into a single, opt-in cue per idle piece. It
 * never produces input and so cannot change the simulation or its RNG.
 */
export class MosaicIdleAssist {
  private hint: MosaicHint | null = null;
  private requestedForSerial: number | null = null;
  private resetTick = 0;

  reset(engineTick: number): void {
    this.resetTick = engineTick;
    this.hint = null;
    this.requestedForSerial = null;
  }

  refresh(experience: MosaicExperienceState): MosaicHint | null {
    const { engine, progress } = experience;
    if (progress.phase !== 'playing' || engine.phase !== 'active' || engine.active === null) {
      this.hint = null;
      return null;
    }
    if (engine.tick - this.resetTick < MOSAIC_IDLE_ASSIST_DELAY_TICKS) return null;
    if (this.requestedForSerial === engine.active.serial) return this.hint;
    this.requestedForSerial = engine.active.serial;
    this.hint = requestMosaicHint(engine);
    return this.hint;
  }
}
