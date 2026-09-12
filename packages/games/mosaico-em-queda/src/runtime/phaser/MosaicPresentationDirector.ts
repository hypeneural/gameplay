import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';

export interface MosaicEffectConsumer {
  consume(effects: readonly MosaicExperienceEffect[]): void;
}

/**
 * One ordered handoff point from deterministic effects to presentation. New
 * directors join here; the Scene never needs to interpret every effect itself.
 */
export class MosaicPresentationDirector {
  constructor(private readonly consumers: readonly MosaicEffectConsumer[]) {}

  consume(effects: readonly MosaicExperienceEffect[]): void {
    if (effects.length === 0) return;
    for (const consumer of this.consumers) consumer.consume(effects);
  }
}
