import type { SceneScope } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { memoryAudio, memorySfxKeyByCue, type MemorySoundCue } from './audioAssets.js';
import {
  memoryMusicBaseVolume,
  memoryMusicDuckForCue,
  memorySoundRateForCue,
} from './MemorySoundPolicy.js';

const cooldownByCue: Readonly<Record<MemorySoundCue, number>> = {
  'card.flip': 70,
  'card.return': 180,
  'hint.magic': 240,
  'pair.match': 180,
  'ui.button': 60,
  'winter.win': 1_000,
};

interface MemoryAudioDirectorInput {
  readonly allowMusic: boolean;
  readonly Phaser: typeof PhaserModule;
  readonly initiallyEnabled: boolean;
  readonly scene: PhaserModule.Scene;
  readonly scope: SceneScope;
}

/** Keeps the audio policy local, gesture-gated, bounded and disposable. */
export class MemoryAudioDirector {
  private readonly lastCueAt = new Map<MemorySoundCue, number>();
  private awaitingMusicUnlock = false;
  private destroyed = false;
  private enabled: boolean;
  private music: PhaserModule.Sound.BaseSound | undefined;
  private musicDuckGeneration = 0;
  private musicUnlockStart: (() => void) | undefined;
  private paused = false;
  private readonly soundOccurrences = new Map<MemorySoundCue, number>();

  constructor(private readonly input: MemoryAudioDirectorInput) {
    this.enabled = input.initiallyEnabled;
    input.scope.add(() => this.destroy());
  }

  get soundEnabled(): boolean {
    return this.enabled;
  }

  startMusicAfterGesture(): void {
    if (
      this.destroyed ||
      !this.input.allowMusic ||
      !this.enabled ||
      this.paused ||
      this.music?.isPlaying ||
      this.awaitingMusicUnlock
    ) {
      return;
    }
    const start = (): void => {
      this.musicUnlockStart = undefined;
      this.awaitingMusicUnlock = false;
      if (
        this.destroyed ||
        !this.input.allowMusic ||
        !this.enabled ||
        this.paused ||
        this.music?.isPlaying
      ) {
        return;
      }
      this.music = this.input.scene.sound.add(memoryAudio.music.key, {
        loop: true,
        volume: memoryMusicBaseVolume,
      });
      this.music.play();
    };
    if (this.input.scene.sound.locked) {
      this.awaitingMusicUnlock = true;
      this.musicUnlockStart = start;
      this.input.scene.sound.once(this.input.Phaser.Sound.Events.UNLOCKED, start);
      return;
    }
    start();
  }

  play(cue: MemorySoundCue): void {
    if (this.destroyed || !this.enabled || (this.paused && cue !== 'ui.button')) return;
    const now = this.input.scene.time.now;
    const previous = this.lastCueAt.get(cue);
    if (previous !== undefined && now - previous < cooldownByCue[cue]) return;
    this.lastCueAt.set(cue, now);
    const occurrence = this.soundOccurrences.get(cue) ?? 0;
    this.soundOccurrences.set(cue, occurrence + 1);
    this.input.scene.sound.play(memorySfxKeyByCue[cue], {
      rate: memorySoundRateForCue(cue, occurrence),
      volume: cue === 'winter.win' ? 0.34 : cue === 'pair.match' ? 0.3 : 0.2,
    });
    this.duckMusicFor(cue);
  }

  toggleAfterGesture(): boolean {
    if (this.destroyed) return false;
    this.enabled = !this.enabled;
    if (this.enabled) this.startMusicAfterGesture();
    else {
      this.stopMusic();
      Object.values(memorySfxKeyByCue).forEach((key) => this.input.scene.sound.stopByKey(key));
    }
    return this.enabled;
  }

  pause(): void {
    if (this.destroyed || this.paused) return;
    this.paused = true;
    this.input.scene.sound.pauseAll();
  }

  resume(): void {
    if (this.destroyed || !this.paused) return;
    this.paused = false;
    this.input.scene.sound.resumeAll();
    if (this.enabled && this.music?.isPaused) this.music.resume();
  }

  private destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopMusicTween();
    this.awaitingMusicUnlock = false;
    this.clearPendingMusicUnlock();
    this.input.scene.sound.stopByKey(memoryAudio.music.key);
    this.music?.destroy();
    this.music = undefined;
    Object.values(memoryAudio).forEach((asset) => this.input.scene.sound.stopByKey(asset.key));
  }

  private stopMusic(): void {
    this.awaitingMusicUnlock = false;
    this.clearPendingMusicUnlock();
    this.stopMusicTween();
    this.input.scene.sound.stopByKey(memoryAudio.music.key);
    this.music?.destroy();
    this.music = undefined;
  }

  private clearPendingMusicUnlock(): void {
    if (!this.musicUnlockStart) return;
    this.input.scene.sound.off(this.input.Phaser.Sound.Events.UNLOCKED, this.musicUnlockStart);
    this.musicUnlockStart = undefined;
  }

  private duckMusicFor(cue: MemorySoundCue): void {
    const duck = memoryMusicDuckForCue(cue);
    const music = this.music;
    if (!duck || !music?.isPlaying || this.destroyed || this.paused) return;

    this.stopMusicTween();
    const generation = this.musicDuckGeneration;
    this.scopeTween({
      duration: duck.downDurationMs,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (this.destroyed || this.paused || generation !== this.musicDuckGeneration) return;
        this.scopeTween({
          delay: duck.holdDurationMs,
          duration: duck.restoreDurationMs,
          ease: 'Sine.easeIn',
          targets: music,
          volume: memoryMusicBaseVolume,
        });
      },
      targets: music,
      volume: duck.targetVolume,
    });
  }

  private scopeTween(config: PhaserModule.Types.Tweens.TweenBuilderConfig): void {
    this.input.scope.resource(this.input.scene.tweens.add(config));
  }

  private stopMusicTween(): void {
    this.musicDuckGeneration += 1;
    if (this.music) this.input.scene.tweens.killTweensOf(this.music);
  }
}
