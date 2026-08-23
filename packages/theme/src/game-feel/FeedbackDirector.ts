import { resolveFeedback } from './EffectPolicy.js';
import type { EffectPolicyOptions, FeedbackInstruction } from './EffectPolicy.js';
import type { FeedbackCue } from './SfxCues.js';

export interface FeedbackPort<Target> {
  animate(target: Target, instruction: FeedbackInstruction): void;
  emitParticles?(target: Target, instruction: FeedbackInstruction): void;
  haptic?(cue: FeedbackInstruction['haptic']): Promise<void> | void;
  playSound?(cue: string): Promise<void> | void;
}

/**
 * A game injects its scene-local port. The director owns no Phaser Scene,
 * timer, tween or asset and can therefore not outlive SceneScope ownership.
 */
export class FeedbackDirector<Target> {
  constructor(
    private readonly options: EffectPolicyOptions,
    private readonly port: FeedbackPort<Target>,
  ) {}

  apply(cue: FeedbackCue, target: Target): FeedbackInstruction {
    const instruction = resolveFeedback(cue, this.options);
    this.port.animate(target, instruction);
    if (instruction.particles) this.port.emitParticles?.(target, instruction);
    void this.port.haptic?.(instruction.haptic);
    if (instruction.soundCue) void this.port.playSound?.(instruction.soundCue);
    return instruction;
  }

  tap(target: Target): FeedbackInstruction {
    return this.apply('tap', target);
  }

  select(target: Target): FeedbackInstruction {
    return this.apply('select', target);
  }

  correct(target: Target): FeedbackInstruction {
    return this.apply('correct', target);
  }

  wrong(target: Target): FeedbackInstruction {
    return this.apply('wrong', target);
  }

  hint(target: Target): FeedbackInstruction {
    return this.apply('hint', target);
  }

  celebrate(target: Target): FeedbackInstruction {
    return this.apply('celebrate', target);
  }
}
