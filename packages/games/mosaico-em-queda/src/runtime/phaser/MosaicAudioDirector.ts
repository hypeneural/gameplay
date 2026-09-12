import type { SceneScope } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';
import { mosaicSoundKeyByCue, type MosaicSoundCue } from './audioAssets.js';

const cooldownByCue: Readonly<Record<MosaicSoundCue, number>> = {
  'ui-press': 65,
  rotate: 100,
  blocked: 180,
  lock: 160,
  clear: 220,
  'memory-reveal': 280,
  'workshop-relief': 400,
  victory: 1000,
};

const priorityByCue: Readonly<Record<MosaicSoundCue, number>> = {
  victory: 80,
  'memory-reveal': 70,
  clear: 60,
  'workshop-relief': 55,
  lock: 50,
  rotate: 40,
  blocked: 35,
  'ui-press': 10,
};

interface MosaicAudioDirectorInput {
  readonly Phaser: typeof PhaserModule;
  readonly initiallyEnabled: boolean;
  readonly scene: PhaserModule.Scene;
  readonly scope: SceneScope;
}

/**
 * Scene-owned, gesture-gated and deliberately small. It chooses one primary
 * cue from a semantic batch instead of layering every mechanical event.
 */
export class MosaicAudioDirector {
  private readonly lastCueAt = new Map<MosaicSoundCue, number>();
  private destroyed = false;
  private enabled: boolean;
  private pendingVictory: PhaserModule.Time.TimerEvent | undefined;
  private paused = false;

  constructor(private readonly input: MosaicAudioDirectorInput) {
    this.enabled = input.initiallyEnabled;
    input.scope.add(() => this.destroy());
  }

  unlockAfterGesture(): void {
    if (this.destroyed || !this.enabled) return;
    if (this.input.scene.sound.locked) this.input.scene.sound.unlock();
  }

  get soundEnabled(): boolean {
    return this.enabled;
  }

  toggleAfterGesture(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.pendingVictory?.remove(false);
      this.pendingVictory = undefined;
      Object.values(mosaicSoundKeyByCue).forEach((key) => this.input.scene.sound.stopByKey(key));
    } else {
      this.unlockAfterGesture();
      this.play('ui-press');
    }
  }

  consume(effects: readonly MosaicExperienceEffect[]): void {
    const cue = selectMosaicPrimarySound(effects);
    if (cue !== null) this.play(cue);
  }

  play(cue: MosaicSoundCue): void {
    if (this.destroyed || (this.paused && cue !== 'ui-press') || !this.enabled) return;
    const key = mosaicSoundKeyByCue[cue];
    if (!this.input.scene.cache.audio.exists(key)) return;
    const now = this.input.scene.time.now;
    const previous = this.lastCueAt.get(cue);
    if (previous !== undefined && now - previous < cooldownByCue[cue]) return;
    this.lastCueAt.set(cue, now);
    if (cue === 'victory') {
      if (this.pendingVictory !== undefined) return;
      // The hero enters first. This is a presentation delay only; it has no
      // authority over completion, progress or the deterministic ruleset.
      this.pendingVictory = this.input.scene.time.delayedCall(140, () => {
        this.pendingVictory = undefined;
        this.playLoaded(cue);
      });
      return;
    }
    this.playLoaded(cue);
  }

  private playLoaded(cue: MosaicSoundCue): void {
    if (this.destroyed || (this.paused && cue !== 'ui-press') || !this.enabled) return;
    const key = mosaicSoundKeyByCue[cue];
    if (!this.input.scene.cache.audio.exists(key)) return;
    this.input.scene.sound.play(key, {
      volume: cue === 'victory' ? 0.34 : cue === 'clear' || cue === 'memory-reveal' ? 0.27 : 0.2,
      rate: cue === 'rotate' ? 1.08 : cue === 'blocked' ? 0.82 : 1,
    });
  }

  pause(): void {
    if (this.destroyed || this.paused) return;
    this.paused = true;
    if (this.pendingVictory !== undefined) this.pendingVictory.paused = true;
    this.input.scene.sound.pauseAll();
  }

  resume(): void {
    if (this.destroyed || !this.paused) return;
    this.paused = false;
    if (this.pendingVictory !== undefined) this.pendingVictory.paused = false;
    this.input.scene.sound.resumeAll();
  }

  private destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pendingVictory?.remove(false);
    this.pendingVictory = undefined;
    Object.values(mosaicSoundKeyByCue).forEach((key) => this.input.scene.sound.stopByKey(key));
  }
}

export function selectMosaicPrimarySound(
  effects: readonly MosaicExperienceEffect[],
): MosaicSoundCue | null {
  let selected: MosaicSoundCue | null = null;
  for (const effect of effects) {
    const candidate = soundForEffect(effect);
    if (
      candidate === null ||
      (selected !== null && priorityByCue[candidate] <= priorityByCue[selected])
    )
      continue;
    selected = candidate;
  }
  return selected;
}

function soundForEffect(effect: MosaicExperienceEffect): MosaicSoundCue | null {
  switch (effect.type) {
    case 'target-reached':
      return 'victory';
    case 'memory-frame-changed':
      return 'memory-reveal';
    case 'lines-cleared':
      return 'clear';
    case 'rows-relieved':
    case 'recovery-requested':
      return 'workshop-relief';
    case 'piece-locked':
      return 'lock';
    case 'piece-rotated':
      return 'rotate';
    default:
      return null;
  }
}
