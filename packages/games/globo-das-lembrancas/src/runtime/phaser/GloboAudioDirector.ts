import type * as Phaser from 'phaser';

type Voice = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

export const globoAudioFiles = [
  'key-ratchet',
  'glass-clink',
  'steam-wipe',
  'chime-note',
  'musicbox-loop',
  'musicbox-celebrate',
].map((name) => ({
  key: `globo-${name}`,
  urls: [
    `/assets/globo-das-lembrancas/audio/${name}.m4a`,
    `/assets/globo-das-lembrancas/audio/${name}.mp3`,
  ],
}));

export type GloboAudioCue =
  'key-ratchet' | 'glass-clink' | 'steam-wipe' | 'chime-note' | 'musicbox-celebrate';

const CUE_CONFIGS: Record<
  GloboAudioCue,
  { sourceIndex: number; volume: number; rate: number; priority: number }
> = {
  'key-ratchet': { sourceIndex: 0, volume: 0.28, rate: 1, priority: 1 },
  'glass-clink': { sourceIndex: 1, volume: 0.35, rate: 1, priority: 1 },
  'steam-wipe': { sourceIndex: 2, volume: 0.25, rate: 1, priority: 0 },
  'chime-note': { sourceIndex: 3, volume: 0.42, rate: 1, priority: 2 },
  'musicbox-celebrate': { sourceIndex: 5, volume: 0.45, rate: 1, priority: 3 },
};

export class GloboAudioDirector {
  private readonly voices = new Map<string, Voice>();
  private activeCue: { voice: Voice; priority: number } | undefined;
  private music: Voice | undefined;
  private musicVolume = 0;
  private finished = false;
  private gestureUnlocked = false;
  private paused = false;
  private disposed = false;
  private lastPlayTime = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private enabled: boolean,
  ) {}

  unlock(): void {
    this.gestureUnlocked = true;
    if (this.scene.sound.locked) {
      this.scene.sound.unlock();
    }
    this.tick(0);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.stopCues();
      this.music?.stop();
      this.musicVolume = 0;
    } else {
      this.tick(0);
    }
  }

  setPaused(value: boolean): void {
    this.paused = value;
    if (value) {
      this.stopCues();
      this.music?.pause();
    } else {
      this.tick(0);
    }
  }

  tick(dt: number): void {
    if (
      !this.enabled ||
      !this.gestureUnlocked ||
      this.paused ||
      this.disposed ||
      this.finished ||
      this.scene.sound.locked
    ) {
      return;
    }

    const musicKey = globoAudioFiles[4]!.key; // musicbox-loop
    if (!this.scene.cache.audio.exists(musicKey)) return;

    this.music ??= this.scene.sound.add(musicKey, { loop: true, volume: 0 }) as Voice;

    if (this.music.isPaused) {
      this.music.resume();
    } else if (!this.music.isPlaying) {
      this.music.play({ loop: true, volume: this.musicVolume });
    }

    // Ducking: drop volume to 0.08 while a priority >= 2 cue is playing, otherwise 0.22
    const targetVolume =
      this.activeCue?.voice.isPlaying && this.activeCue.priority >= 2 ? 0.08 : 0.22;
    this.musicVolume +=
      (targetVolume - this.musicVolume) *
      Math.min(1, dt * (targetVolume < this.musicVolume ? 14 : 3));
    this.music.setVolume(this.musicVolume);
  }

  play(cue: GloboAudioCue, pitchRate = 1.0): void {
    if (cue === 'musicbox-celebrate') {
      this.finished = true;
      this.music?.stop();
    }

    if (
      !this.enabled ||
      !this.gestureUnlocked ||
      (this.paused && cue !== 'key-ratchet') ||
      this.disposed ||
      this.scene.sound.locked
    ) {
      return;
    }

    const config = CUE_CONFIGS[cue];
    const key = globoAudioFiles[config.sourceIndex]!.key;
    if (!this.scene.cache.audio.exists(key)) return;

    // Reject if a higher priority voice is currently playing
    if (this.activeCue?.voice.isPlaying && this.activeCue.priority > config.priority) {
      return;
    }

    // Cooldown check (90ms) for equal or lower priority
    const now = this.scene.time.now;
    if (now - this.lastPlayTime < 90 && config.priority <= (this.activeCue?.priority ?? 0)) {
      return;
    }

    let voice = this.voices.get(key);
    if (!voice) {
      voice = this.scene.sound.add(key) as Voice;
      this.voices.set(key, voice);
    }

    this.stopCues();
    if (voice.play({ volume: config.volume, rate: config.rate * pitchRate, loop: false })) {
      this.activeCue = { voice, priority: config.priority };
      this.lastPlayTime = now;
    }
  }

  private stopCues(): void {
    for (const voice of this.voices.values()) {
      voice.stop();
    }
    this.activeCue = undefined;
  }

  destroy(): void {
    this.disposed = true;
    this.stopCues();
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
    for (const voice of this.voices.values()) {
      voice.destroy();
    }
    this.voices.clear();
  }
}
