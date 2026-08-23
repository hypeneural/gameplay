import { FeedbackDirector } from './FeedbackDirector.js';
import type { FeedbackPort } from './FeedbackDirector.js';
import type { EffectPolicyOptions } from './EffectPolicy.js';

/** Small named composition; it is not a Phaser base scene or lifecycle owner. */
export function createChristmasEffects<Target>(
  options: EffectPolicyOptions,
  port: FeedbackPort<Target>,
): FeedbackDirector<Target> {
  return new FeedbackDirector(options, port);
}
