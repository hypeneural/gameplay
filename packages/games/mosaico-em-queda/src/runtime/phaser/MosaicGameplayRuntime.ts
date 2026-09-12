import type { MosaicInputFrame } from '../../domain/EngineTypes.js';
import {
  advanceMosaicExperience,
  applyMosaicWorkshopRelief,
  createMosaicExperience,
  type MosaicExperienceEffect,
  type MosaicExperienceState,
} from '../../domain/MosaicExperience.js';
import type { MosaicHint } from '../../domain/MosaicHint.js';
import type { MosaicMode } from '../../domain/MosaicProgress.js';
import { MosaicIdleAssist } from '../MosaicIdleAssist.js';
import { MosaicFixedStepClock } from './MosaicFixedStepClock.js';

export interface MosaicGameplayUpdate {
  readonly effects: readonly MosaicExperienceEffect[];
  /** The shell may resolve the user interaction, but only after real motion. */
  readonly interactionSettled: boolean;
}

/**
 * Pure-domain round flow plus its scene-local fixed clock. Phaser owns the
 * lifecycle and receives ordered updates, while this class owns neither a
 * GameObject nor an input listener.
 */
export class MosaicGameplayRuntime {
  private readonly fixedStep = new MosaicFixedStepClock();
  private readonly idleAssist = new MosaicIdleAssist();
  private hintState: MosaicHint | null = null;
  private stateValue: MosaicExperienceState;

  constructor(
    private readonly mode: MosaicMode,
    private readonly runSeed: number,
    materialSlotCount: number,
  ) {
    this.stateValue = createMosaicExperience(mode, runSeed, materialSlotCount);
    this.resetAssist();
  }

  get hint(): MosaicHint | null {
    return this.hintState;
  }

  get recoveryPending(): boolean {
    return this.stateValue.progress.phase === 'recovering';
  }

  get state(): MosaicExperienceState {
    return this.stateValue;
  }

  reset(materialSlotCount: number): void {
    this.stateValue = createMosaicExperience(this.mode, this.runSeed, materialSlotCount);
    this.fixedStep.reset();
    this.resetAssist();
  }

  resetClock(): void {
    this.fixedStep.reset();
  }

  advancePresentation(
    deltaMs: number,
    readInput: () => MosaicInputFrame,
    receive: (update: MosaicGameplayUpdate) => void,
  ): number {
    return this.fixedStep.advance(deltaMs, () => receive(this.advance(readInput())));
  }

  advance(input: MosaicInputFrame): MosaicGameplayUpdate {
    const activeSerialBeforeAdvance = this.stateValue.engine.active?.serial ?? null;
    const transition = advanceMosaicExperience(this.stateValue, input);
    this.stateValue = transition.state;
    const inputMovedPiece =
      (input.leftPressed || input.rightPressed || input.rotateCWPressed || input.softDropPressed) &&
      transition.effects.some(
        (effect) => effect.type === 'piece-moved' || effect.type === 'piece-rotated',
      );
    const boardProgressed = transition.effects.some(
      (effect) => effect.type === 'piece-locked' || effect.type === 'lines-cleared',
    );
    const activeSerialAfterAdvance = this.stateValue.engine.active?.serial ?? null;
    if (
      inputMovedPiece ||
      boardProgressed ||
      activeSerialBeforeAdvance !== activeSerialAfterAdvance
    )
      this.resetAssist();
    this.hintState = this.idleAssist.refresh(this.stateValue);
    return { effects: transition.effects, interactionSettled: inputMovedPiece };
  }

  applyWorkshopRelief(): MosaicGameplayUpdate {
    const transition = applyMosaicWorkshopRelief(this.stateValue);
    this.stateValue = transition.state;
    this.fixedStep.reset();
    this.resetAssist();
    return { effects: transition.effects, interactionSettled: false };
  }

  private resetAssist(): void {
    this.idleAssist.reset(this.stateValue.engine.tick);
    this.hintState = null;
  }
}
