/** Local M4A/MP3 fallbacks are loaded before READY and stay scoped to this game. */
const audioBasePath = '/assets/guirlanda-das-lembrancas/audio';

export const garlandAudio = {
  place: {
    key: 'guirlanda-sfx-place',
    urls: [`${audioBasePath}/encaixe.m4a`, `${audioBasePath}/encaixe.mp3`],
  },
  press: {
    key: 'guirlanda-sfx-press',
    urls: [`${audioBasePath}/toque.m4a`, `${audioBasePath}/toque.mp3`],
  },
  victory: {
    key: 'guirlanda-sfx-victory',
    urls: [`${audioBasePath}/vitoria.m4a`, `${audioBasePath}/vitoria.mp3`],
  },
} as const;

export type GarlandSoundCue =
  | 'press'
  | 'select'
  | 'lift'
  | 'place'
  | 'return'
  | 'hint'
  | 'box-open'
  | 'light-travel'
  | 'victory';

type VoiceConfig = { volume: number; rate: number; loop: false; seek: 0; delay: 0 };

/** Structural subset of Phaser 4.2.1 BaseSound; tests do not need a browser. */
type GarlandVoice = {
  readonly isPlaying: boolean;
  readonly isPaused: boolean;
  play(config: VoiceConfig): boolean;
  pause(): boolean;
  resume(): boolean;
  stop(): boolean;
  destroy(): void;
};

type CueMix = { key: string; volume: number; rate: number; priority: number };

// Three authorized sources, differentiated by intention without adding downloads.
// Decorative accents may never replace contact feedback or the victory signature.
const cueMix: Readonly<Record<GarlandSoundCue, CueMix>> = {
  press: { key: garlandAudio.press.key, volume: 0.13, rate: 0.98, priority: 1 },
  select: { key: garlandAudio.press.key, volume: 0.19, rate: 1.06, priority: 2 },
  lift: { key: garlandAudio.press.key, volume: 0.14, rate: 1.12, priority: 2 },
  place: { key: garlandAudio.place.key, volume: 0.27, rate: 1, priority: 3 },
  return: { key: garlandAudio.press.key, volume: 0.1, rate: 0.88, priority: 2 },
  hint: { key: garlandAudio.place.key, volume: 0.1, rate: 1.1, priority: 0 },
  'box-open': { key: garlandAudio.press.key, volume: 0.15, rate: 0.93, priority: 0 },
  'light-travel': { key: garlandAudio.place.key, volume: 0.085, rate: 1.14, priority: 0 },
  victory: { key: garlandAudio.victory.key, volume: 0.3, rate: 1, priority: 4 },
};

const rateVariations = [0, 0.012, -0.01, 0.006] as const;

/** Scene-owned and gesture-gated; it never takes ownership of game state. */
export class GarlandAudioDirector {
  private destroyed = false;
  private enabled: boolean;
  private paused = false;
  private gestureReceived = false;
  private readonly voices = new Map<string, GarlandVoice>();
  private active: { voice: GarlandVoice; priority: number } | undefined;
  private pausedVoice: GarlandVoice | undefined;
  private readonly lastPlayedAt = new Map<GarlandSoundCue, number>();
  private readonly playCounts = new Map<GarlandSoundCue, number>();

  constructor(
    private readonly sound: {
      locked: boolean;
      unlock(): void;
      add(key: string): GarlandVoice;
    },
    private readonly audioCache: { exists(key: string): boolean },
    private readonly now: () => number,
    initiallyEnabled: boolean,
  ) {
    this.enabled = initiallyEnabled;
  }

  unlockAfterGesture(): void {
    if (this.destroyed) return;
    this.gestureReceived = true;
    // Unlocking does not play anything, including when this gesture enables sound.
    if (this.sound.locked) this.sound.unlock();
  }

  setEnabled(enabled: boolean): void {
    if (this.destroyed) return;
    this.enabled = enabled;
    if (!enabled) this.stopOwnedVoices();
  }

  play(cue: GarlandSoundCue): void {
    if (
      this.destroyed ||
      (this.paused && cue !== 'press') ||
      !this.enabled ||
      !this.gestureReceived ||
      this.sound.locked
    )
      return;
    const mix = cueMix[cue];
    if (!this.audioCache.exists(mix.key)) return;
    const previous = this.lastPlayedAt.get(cue);
    const now = this.now();
    if (previous !== undefined && now - previous < 90) return;
    if (
      this.active &&
      (this.active.voice.isPlaying || this.active.voice.isPaused) &&
      this.active.priority > mix.priority
    )
      return;

    let voice = this.voices.get(mix.key);
    if (!voice) {
      voice = this.sound.add(mix.key);
      this.voices.set(mix.key, voice);
    }
    this.active?.voice.stop();
    this.active = undefined;
    const playCount = this.playCounts.get(cue) ?? 0;
    const variation =
      cue === 'victory' ? 0 : (rateVariations[playCount % rateVariations.length] ?? 0);
    // Do not enqueue an action while mobile audio is locked: stale cues must not
    // suddenly play on a later gesture. Rejected playback also spends no cooldown.
    if (
      voice.play({ volume: mix.volume, rate: mix.rate + variation, loop: false, seek: 0, delay: 0 })
    ) {
      this.active = { voice, priority: mix.priority };
      this.lastPlayedAt.set(cue, now);
      this.playCounts.set(cue, playCount + 1);
    }
  }

  pause(): void {
    if (this.destroyed || this.paused) return;
    this.paused = true;
    const voice = this.active?.voice;
    if (voice?.isPlaying) voice.pause();
    if (voice?.isPaused) this.pausedVoice = voice;
  }

  resume(): void {
    if (this.destroyed || !this.paused) return;
    this.paused = false;
    if (this.enabled && !this.sound.locked) this.pausedVoice?.resume();
    else this.pausedVoice?.stop();
    this.pausedVoice = undefined;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopOwnedVoices();
    for (const voice of this.voices.values()) voice.destroy();
    this.voices.clear();
    this.lastPlayedAt.clear();
    this.playCounts.clear();
  }

  private stopOwnedVoices(): void {
    for (const voice of this.voices.values()) voice.stop();
    this.active = undefined;
    this.pausedVoice = undefined;
  }
}
