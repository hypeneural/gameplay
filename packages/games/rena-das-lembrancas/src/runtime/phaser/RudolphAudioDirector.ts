import type * as Phaser from 'phaser';

type Voice = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;
export const rudolphAudio = [
  'toque',
  'encaixe',
  'vitoria',
  'snow-v1',
  'paper-v1',
  'bells-v1',
  'magic-v1',
  'winter-loop-v1',
].map((name) => ({
  key: `rudolph-${name}`,
  urls: [
    `/assets/rena-das-lembrancas/audio/${name}.m4a`,
    `/assets/rena-das-lembrancas/audio/${name}.mp3`,
  ],
}));
export type RudolphCue = 'tap' | 'catch' | 'miss' | 'magic' | 'finish' | 'bells' | 'snow' | 'paper';
const cues = {
  tap: { source: 0, volume: 0.14, rate: 1, priority: 1 },
  catch: { source: 1, volume: 0.3, rate: 1, priority: 3 },
  miss: { source: 3, volume: 0.4, rate: 0.85, priority: 0 },
  magic: { source: 6, volume: 0.45, rate: 1, priority: 2 },
  finish: { source: 2, volume: 0.3, rate: 1, priority: 4 },
  bells: { source: 5, volume: 0.4, rate: 1, priority: 1 },
  snow: { source: 3, volume: 0.45, rate: 1, priority: 0 },
  paper: { source: 4, volume: 0.45, rate: 1, priority: 1 },
};

/** One musical bed + one prioritized cue, retained and owned by this run. */
export class RudolphAudioDirector {
  private readonly voices = new Map<string, Voice>();
  private active: { voice: Voice; priority: number } | undefined;
  private music: Voice | undefined;
  private musicVolume = 0;
  private finished = false;
  private gesture = false;
  private paused = false;
  private disposed = false;
  private lastTime = -Infinity;
  constructor(
    private readonly scene: Phaser.Scene,
    private enabled: boolean,
  ) {}
  unlock(): void {
    this.gesture = true;
    if (this.scene.sound.locked) this.scene.sound.unlock();
    this.tick(0);
  }
  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.stopCues();
      this.music?.stop();
      this.musicVolume = 0;
    } else this.tick(0);
  }
  setPaused(value: boolean): void {
    this.paused = value;
    if (value) {
      this.stopCues();
      this.music?.pause();
    } else this.tick(0);
  }
  tick(dt: number): void {
    if (
      !this.enabled ||
      !this.gesture ||
      this.paused ||
      this.disposed ||
      this.finished ||
      this.scene.sound.locked
    )
      return;
    const key = rudolphAudio[7]!.key;
    if (!this.scene.cache.audio.exists(key)) return;
    this.music ??= this.scene.sound.add(key, { loop: true, volume: 0 }) as Voice;
    if (this.music.isPaused) this.music.resume();
    else if (!this.music.isPlaying) this.music.play({ loop: true, volume: this.musicVolume });
    const target = this.active?.voice.isPlaying ? 0.075 : 0.22;
    this.musicVolume +=
      (target - this.musicVolume) * Math.min(1, dt * (target < this.musicVolume ? 16 : 3));
    this.music.setVolume(this.musicVolume);
  }
  play(cue: RudolphCue): void {
    if (cue === 'finish') {
      this.finished = true;
      this.music?.stop();
    }
    if (
      !this.enabled ||
      !this.gesture ||
      (this.paused && cue !== 'tap' && cue !== 'paper') ||
      this.disposed ||
      this.scene.sound.locked
    )
      return;
    const config = cues[cue];
    const key = rudolphAudio[config.source]!.key;
    if (!this.scene.cache.audio.exists(key)) return;
    if (this.active?.voice.isPlaying && this.active.priority > config.priority) return;
    if (this.scene.time.now - this.lastTime < 90 && config.priority <= (this.active?.priority ?? 0))
      return;
    let voice = this.voices.get(key);
    if (!voice) {
      voice = this.scene.sound.add(key) as Voice;
      this.voices.set(key, voice);
    }
    this.stopCues();
    if (voice.play({ volume: config.volume, rate: config.rate, loop: false, seek: 0, delay: 0 })) {
      this.active = { voice, priority: config.priority };
      this.lastTime = this.scene.time.now;
    }
  }
  private stopCues(): void {
    for (const voice of this.voices.values()) voice.stop();
    this.active = undefined;
  }
  destroy(): void {
    this.disposed = true;
    this.stopCues();
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
    for (const voice of this.voices.values()) voice.destroy();
    this.voices.clear();
  }
}
