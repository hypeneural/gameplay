import type * as PhaserModule from 'phaser';

import { expressoAudio, type ExpressoSoundCue } from './audioAssets.js';

const cuePolicy: Readonly<
  Record<Exclude<ExpressoSoundCue, 'railRoll'>, Readonly<{ cooldownMs: number; volume: number }>>
> = {
  tap: { cooldownMs: 90, volume: 0.16 },
  correct: { cooldownMs: 260, volume: 0.24 },
  wrong: { cooldownMs: 180, volume: 0.13 },
  celebrate: { cooldownMs: 1_000, volume: 0.32 },
  steamRelease: { cooldownMs: 300, volume: 0.16 },
  toyWhistle: { cooldownMs: 700, volume: 0.22 },
  arrivalBrake: { cooldownMs: 420, volume: 0.15 },
};

/**
 * Owns only Expresso sounds. The retained rail sound is deliberately separate
 * from one-shot cues so pause, mute, resume and scene destruction cannot leave
 * a locomotive running after its visual journey stopped.
 */
export class ExpressAudioDirector {
  private readonly lastPlayedAt = new Map<Exclude<ExpressoSoundCue, 'railRoll'>, number>();
  private soundEnabled: boolean;
  private travelSound: PhaserModule.Sound.BaseSound | undefined;

  constructor(
    private readonly sound: PhaserModule.Sound.BaseSoundManager,
    private readonly now: () => number,
    initialSoundEnabled: boolean,
  ) {
    this.soundEnabled = initialSoundEnabled;
  }

  play(cue: Exclude<ExpressoSoundCue, 'railRoll'>): void {
    if (!this.soundEnabled) return;
    const policy = cuePolicy[cue];
    const previous = this.lastPlayedAt.get(cue);
    const timestamp = this.now();
    if (previous !== undefined && timestamp - previous < policy.cooldownMs) return;
    this.lastPlayedAt.set(cue, timestamp);
    try {
      this.sound.play(expressoAudio[cue].key, { volume: policy.volume });
    } catch {
      // Audio is always optional; a cache/backend failure must not stop the journey.
    }
  }

  startTravel(): void {
    if (!this.soundEnabled) return;
    const travelSound = this.getTravelSound();
    if (!travelSound) return;
    try {
      if (travelSound.isPaused) {
        travelSound.resume();
      } else if (!travelSound.isPlaying) {
        travelSound.play();
      }
    } catch {
      // The visual train remains authoritative when a browser cannot play audio.
    }
  }

  pauseTravel(): void {
    if (this.travelSound?.isPlaying) this.travelSound.pause();
  }

  stopTravel(): void {
    if (this.travelSound?.isPlaying || this.travelSound?.isPaused) this.travelSound.stop();
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopTravel();
      Object.values(expressoAudio).forEach((asset) => this.sound.stopByKey(asset.key));
    }
  }

  destroy(): void {
    this.stopTravel();
    this.travelSound?.destroy();
    this.travelSound = undefined;
    this.lastPlayedAt.clear();
  }

  private getTravelSound(): PhaserModule.Sound.BaseSound | undefined {
    if (this.travelSound) return this.travelSound;
    try {
      this.travelSound = this.sound.add(expressoAudio.railRoll.key, {
        loop: true,
        volume: 0.11,
      });
      return this.travelSound;
    } catch {
      return undefined;
    }
  }
}
