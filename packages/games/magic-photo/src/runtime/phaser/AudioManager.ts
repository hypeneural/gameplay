import type * as Phaser from 'phaser';

export const audioAssets = [
  'tap',
  'paper',
  'open',
  'magic',
  'bells',
  'snow',
  'reveal',
  'music',
] as const;
export type MagicCue =
  | 'tap'
  | 'tap2'
  | 'ready'
  | 'ribbon'
  | 'open'
  | 'reveal'
  | 'trail'
  | 'star'
  | 'snow'
  | 'lights'
  | 'santa'
  | 'wonder'
  | 'frost'
  | 'scrape'
  | 'crack1'
  | 'crack2'
  | 'break'
  | 'finale';
type Asset = (typeof audioAssets)[number];
const mixes: Record<MagicCue, readonly [Asset, number, number, number]> = {
  tap: ['tap', 0.22, 0.95, 1],
  tap2: ['paper', 0.28, 0.9, 2],
  ready: ['bells', 0.3, 1, 3],
  ribbon: ['paper', 0.16, 1.12, 1],
  open: ['open', 0.36, 0.9, 4],
  reveal: ['reveal', 0.27, 1, 4],
  trail: ['magic', 0.07, 1.1, 0],
  star: ['magic', 0.24, 1, 3],
  snow: ['snow', 0.2, 1, 3],
  lights: ['bells', 0.23, 1.13, 3],
  santa: ['bells', 0.25, 0.75, 3],
  wonder: ['reveal', 0.3, 1.1, 4],
  frost: ['snow', 0.18, 0.75, 2],
  scrape: ['paper', 0.085, 0.82, 0],
  crack1: ['open', 0.23, 1.2, 3],
  crack2: ['open', 0.3, 0.8, 3],
  break: ['open', 0.36, 0.7, 5],
  finale: ['reveal', 0.36, 0.9, 5],
};

/** Scoped audio with an explicitly documented local foley/voice fallback palette. */
export class AudioManager {
  private readonly voices = new Map<Asset, Phaser.Sound.BaseSound>();
  private readonly last = new Map<string, number>();
  private active: { sound: Phaser.Sound.BaseSound; priority: number } | undefined;
  private music: Phaser.Sound.BaseSound | undefined;
  private unlocked = false;
  private paused = false;
  private destroyed = false;
  private duckUntil = 0;
  private variation = 0;
  constructor(
    private readonly scene: Phaser.Scene,
    private enabled: boolean,
    private readonly musicAllowed: boolean,
  ) {}

  gesture(): void {
    if (this.destroyed) return;
    this.unlocked = true;
    if (this.scene.sound.locked) this.scene.sound.unlock();
    this.update();
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
    else this.update();
  }

  play(cue: MagicCue): boolean {
    if (this.destroyed || !this.unlocked || !this.enabled || this.paused || this.scene.sound.locked)
      return false;
    const [asset, volume, rate, priority] = mixes[cue];
    const now = this.scene.time.now;
    const category = cue === 'trail' || cue === 'scrape' ? 'continuous' : cue;
    const cooldown = cue === 'scrape' ? 180 : cue === 'trail' ? 140 : 90;
    if (now - (this.last.get(category) ?? -1000) < cooldown) return false;
    if (this.active?.sound.isPlaying && this.active.priority > priority) return false;
    const key = `magic-photo-audio-${asset}`;
    if (!this.scene.cache.audio.exists(key)) return false;
    let voice = this.voices.get(asset);
    if (!voice) {
      voice = this.scene.sound.add(key);
      this.voices.set(asset, voice);
    }
    this.active?.sound.stop();
    const played = voice.play({
      volume,
      rate: rate + (priority < 3 ? [0, 0.025, -0.018][this.variation++ % 3]! : 0),
      loop: false,
      seek: 0,
    });
    if (!played) return false;
    this.active = { sound: voice, priority };
    this.last.set(category, now);
    if (cue === 'santa' || cue === 'break' || cue === 'finale') this.duckUntil = now + 1200;
    return true;
  }

  update(): void {
    if (
      this.destroyed ||
      this.paused ||
      !this.enabled ||
      !this.unlocked ||
      this.scene.sound.locked ||
      !this.musicAllowed
    )
      return;
    const key = 'magic-photo-audio-music';
    if (!this.scene.cache.audio.exists(key)) return;
    this.music ??= this.scene.sound.add(key);
    if (!this.music.isPlaying) this.music.play({ loop: true, volume: 0.075 });
    const music = this.music as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
    const target = this.scene.time.now < this.duckUntil ? 0.025 : 0.075;
    music.setVolume(music.volume + (target - music.volume) * 0.12);
  }
  pause(): void {
    this.paused = true;
    this.stop();
  }
  resume(): void {
    this.paused = false;
    this.update();
  }
  private stop(): void {
    this.active?.sound.stop();
    this.music?.stop();
  }
  destroy(): void {
    if (this.destroyed) return;
    this.stop();
    this.destroyed = true;
    for (const voice of this.voices.values()) voice.destroy();
    this.music?.destroy();
    this.voices.clear();
    this.last.clear();
  }
}
