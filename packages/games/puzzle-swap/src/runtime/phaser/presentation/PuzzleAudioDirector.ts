import type { SceneScope } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { puzzleAudio, puzzleSfxKeyByCue } from '../audioAssets.js';

const cooldownByCue: Readonly<Record<string, number>> = {
  'ui.tap': 55,
  'ui.select': 55,
  'feedback.hint': 240,
  'feedback.correct': 180,
  'feedback.wrong': 180,
  'christmas.win': 1_000,
};

interface PuzzleAudioDirectorInput {
  Phaser: typeof PhaserModule;
  scene: PhaserModule.Scene;
  scope: SceneScope;
  initiallyEnabled: boolean;
}

/** Scene-owned sound policy: gesture-gated music, bounded cues and explicit mute. */
export class PuzzleAudioDirector {
  private readonly lastCueAt = new Map<string, number>();
  private music: PhaserModule.Sound.BaseSound | undefined;
  private awaitingMusicUnlock = false;
  private enabled: boolean;

  constructor(private readonly input: PuzzleAudioDirectorInput) {
    this.enabled = input.initiallyEnabled;
  }

  get soundEnabled(): boolean {
    return this.enabled;
  }

  startMusicAfterGesture(): void {
    if (!this.enabled || this.music?.isPlaying || this.awaitingMusicUnlock) return;
    const start = (): void => {
      this.awaitingMusicUnlock = false;
      if (!this.enabled || this.music?.isPlaying) return;
      this.music = this.input.scene.sound.add(puzzleAudio.music.key, { loop: true, volume: 0.13 });
      this.input.scope.resource(this.music);
      this.music.play();
    };
    if (this.input.scene.sound.locked) {
      this.awaitingMusicUnlock = true;
      this.input.scene.sound.once(this.input.Phaser.Sound.Events.UNLOCKED, start);
      this.input.scope.add(() => {
        this.awaitingMusicUnlock = false;
        this.input.scene.sound.off(this.input.Phaser.Sound.Events.UNLOCKED, start);
      });
      return;
    }
    start();
  }

  playFeedbackSound(cue: string): void {
    if (!this.enabled) return;
    const key = puzzleSfxKeyByCue[cue];
    if (!key) return;
    const now = this.input.scene.time.now;
    const cooldown = cooldownByCue[cue] ?? 120;
    const previous = this.lastCueAt.get(cue);
    if (previous !== undefined && now - previous < cooldown) return;
    this.lastCueAt.set(cue, now);
    const volume = cue === 'christmas.win' ? 0.36 : cue === 'feedback.correct' ? 0.3 : 0.2;
    this.input.scene.sound.play(key, { volume });
  }

  toggleAfterGesture(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.startMusicAfterGesture();
    else this.stopMusic();
    return this.enabled;
  }

  pause(): void {
    this.music?.pause();
  }

  resume(): void {
    if (this.enabled) this.music?.resume();
  }

  private stopMusic(): void {
    this.awaitingMusicUnlock = false;
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
  }
}
