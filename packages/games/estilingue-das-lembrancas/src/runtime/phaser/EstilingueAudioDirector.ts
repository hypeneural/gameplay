import type * as Phaser from 'phaser';

type Voice = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

export const estilingueAudioFiles = [
  'elastic-pull-v1',
  'elastic-snap-v1',
  'snow-whoosh-v1',
  'impact-wood-v1',
  'impact-gingerbread-v1',
  'impact-bell-v1',
  'impact-bauble-v1',
  'fragment-fly-v1',
  'frame-slot-v1',
  'celebration-fanfare-v1',
  'button-press-v1',
  'winter-loop-v1',
].map((name) => ({
  key: `estilingue-${name}`,
  urls: [
    `/assets/estilingue-das-lembrancas/audio/${name}.m4a`,
    `/assets/estilingue-das-lembrancas/audio/${name}.mp3`,
  ],
}));

export type EstilingueCue =
  | 'pull'
  | 'snap'
  | 'whoosh'
  | 'wood'
  | 'gingerbread'
  | 'bell'
  | 'bauble'
  | 'fragment-fly'
  | 'frame-slot'
  | 'celebrate'
  | 'button-press';

interface CueConfig {
  sourceIndex: number;
  volume: number;
  rate: number;
  priority: number;
}

const CUE_CONFIGS: Record<EstilingueCue, CueConfig> = {
  pull: { sourceIndex: 0, volume: 0.26, rate: 1.0, priority: 1 },
  snap: { sourceIndex: 1, volume: 0.38, rate: 1.0, priority: 2 },
  whoosh: { sourceIndex: 2, volume: 0.22, rate: 1.0, priority: 1 },
  wood: { sourceIndex: 3, volume: 0.35, rate: 1.0, priority: 2 },
  gingerbread: { sourceIndex: 4, volume: 0.36, rate: 1.0, priority: 2 },
  bell: { sourceIndex: 5, volume: 0.38, rate: 1.0, priority: 2 },
  bauble: { sourceIndex: 6, volume: 0.36, rate: 1.0, priority: 2 },
  'fragment-fly': { sourceIndex: 7, volume: 0.4, rate: 1.0, priority: 3 },
  'frame-slot': { sourceIndex: 8, volume: 0.45, rate: 1.0, priority: 3 },
  celebrate: { sourceIndex: 9, volume: 0.48, rate: 1.0, priority: 4 },
  'button-press': { sourceIndex: 10, volume: 0.28, rate: 1.0, priority: 1 },
};

export class EstilingueAudioDirector {
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

    const musicKey = estilingueAudioFiles[11]!.key; // winter-loop-v1
    if (!this.scene.cache.audio.exists(musicKey)) return;

    this.music ??= this.scene.sound.add(musicKey, { loop: true, volume: 0 }) as Voice;

    if (this.music.isPaused) {
      this.music.resume();
    } else if (!this.music.isPlaying) {
      this.music.play({ loop: true, volume: this.musicVolume });
    }

    // Ducking: lower music volume when active cue is playing
    const targetVolume = this.activeCue?.voice.isPlaying ? 0.05 : 0.18;
    const rate = targetVolume < this.musicVolume ? 14 : 3;
    this.musicVolume += (targetVolume - this.musicVolume) * Math.min(1, dt * rate);
    this.music.setVolume(this.musicVolume);
  }

  play(
    cue: EstilingueCue,
    options?: { pitchVariation?: boolean; rate?: number; volumeMultiplier?: number },
  ): void {
    if (cue === 'celebrate') {
      this.finished = true;
      this.music?.stop();
    }

    if (
      !this.enabled ||
      !this.gestureUnlocked ||
      (this.paused && cue !== 'button-press') ||
      this.disposed ||
      this.scene.sound.locked
    ) {
      return;
    }

    const config = CUE_CONFIGS[cue];
    if (!config) return;

    const file = estilingueAudioFiles[config.sourceIndex];
    if (!file) return;

    const key = file.key;
    if (!this.scene.cache.audio.exists(key)) return;

    if (this.activeCue?.voice.isPlaying && this.activeCue.priority > config.priority) {
      return;
    }

    const now = this.scene.time.now;
    if (now - this.lastPlayTime < 80 && config.priority <= (this.activeCue?.priority ?? 0)) {
      return;
    }

    let voice = this.voices.get(key);
    if (!voice) {
      voice = this.scene.sound.add(key) as Voice;
      this.voices.set(key, voice);
    }

    this.stopCues();

    let playRate = options?.rate ?? config.rate;
    if (options?.pitchVariation) {
      // Modulate pitch between 0.96 and 1.04
      const delta = (Math.random() - 0.5) * 0.08;
      playRate += delta;
    }

    const vol = config.volume * (options?.volumeMultiplier ?? 1.0);

    if (voice.play({ volume: vol, rate: playRate, loop: false, seek: 0, delay: 0 })) {
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
