import type * as Phaser from 'phaser';

export type LanternaAudioCue =
  | 'ratchet'
  | 'snap'
  | 'star'
  | 'beam'
  | 'shutter'
  | 'celebrate'
  | 'tap'
  | 'charge-tick'
  | 'explosion'
  | 'confetti-pop'
  | 'bulb-clink'
  | 'fireplace-crackle'
  | 'hint-magic';

export const lanternaAudioFiles = [
  {
    key: 'lanterna-music',
    urls: [
      '/assets/globo-das-lembrancas/audio/musicbox-loop.mp3',
      '/assets/globo-das-lembrancas/audio/musicbox-loop.m4a',
    ],
  },
  {
    key: 'lanterna-celebrate-music',
    urls: [
      '/assets/globo-das-lembrancas/audio/musicbox-celebrate.mp3',
      '/assets/globo-das-lembrancas/audio/musicbox-celebrate.m4a',
    ],
  },
  {
    key: 'lanterna-ratchet-real',
    urls: [
      '/assets/globo-das-lembrancas/audio/key-ratchet.mp3',
      '/assets/globo-das-lembrancas/audio/key-ratchet.m4a',
    ],
  },
  {
    key: 'lanterna-glass-clink',
    urls: [
      '/assets/globo-das-lembrancas/audio/glass-clink.mp3',
      '/assets/globo-das-lembrancas/audio/glass-clink.m4a',
    ],
  },
  {
    key: 'lanterna-chime-note',
    urls: [
      '/assets/globo-das-lembrancas/audio/chime-note.mp3',
      '/assets/globo-das-lembrancas/audio/chime-note.m4a',
    ],
  },
  {
    key: 'lanterna-tap',
    urls: ['/assets/christmas-shell/audio/tap-v1.mp3'],
  },
  {
    key: 'lanterna-bells',
    urls: ['/assets/christmas-shell/audio/bells-a-v1.mp3'],
  },
  {
    key: 'lanterna-bells-b',
    urls: ['/assets/christmas-shell/audio/bells-b-v1.mp3'],
  },
  {
    key: 'lanterna-magic',
    urls: ['/assets/christmas-shell/audio/magic-v1.mp3'],
  },
  {
    key: 'lanterna-reveal',
    urls: ['/assets/christmas-shell/audio/reveal-v1.mp3'],
  },
  {
    key: 'lanterna-open',
    urls: ['/assets/christmas-shell/audio/open-v1.mp3'],
  },
];

type Voice = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

export class LanternaAudioDirector {
  private enabled: boolean;
  private paused = false;
  private gestureUnlocked = false;
  private audioCtx: AudioContext | null = null;
  private lastPlayTimes = new Map<LanternaAudioCue, number>();

  // Real Christmas Music Loop & Celebrate
  private musicSound: Voice | null = null;
  private celebrateSound: Voice | null = null;
  private musicVolume = 0;
  private musicDucked = false;
  private isDisposed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    initiallyEnabled: boolean,
  ) {
    this.enabled = initiallyEnabled;
    this.initWebAudio();
  }

  private initWebAudio(): void {
    if (typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          this.audioCtx = new AudioContextClass();
        } catch {
          // WebAudio unavailable
          this.audioCtx = null;
        }
      }
    }
  }

  unlock(): void {
    if (this.gestureUnlocked) return;
    this.gestureUnlocked = true;

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    if (this.scene.sound && this.scene.sound.locked) {
      this.scene.sound.unlock();
    }

    this.tick(0);
  }

  setBeamPresence(_segmentCount: number): void {
    // Optical beam is naturally silent; Christmas music box is the pure harmonic centerpiece
  }

  setChargeDrone(_progress: number): void {
    // Acoustic chime ticks handle charge feedback with zero electronic buzzing
  }

  tick(dt: number): void {
    if (
      !this.enabled ||
      !this.gestureUnlocked ||
      this.paused ||
      this.isDisposed ||
      (this.scene.sound && this.scene.sound.locked)
    ) {
      return;
    }

    const musicKey = 'lanterna-music';
    if (!this.scene.cache.audio.exists(musicKey)) return;

    if (!this.musicSound && this.scene.sound) {
      this.musicSound = this.scene.sound.add(musicKey, {
        loop: true,
        volume: 0,
      }) as Voice;
    }

    if (this.musicSound) {
      if (this.musicSound.isPaused) {
        this.musicSound.resume();
      } else if (!this.musicSound.isPlaying) {
        this.musicSound.play({ loop: true, volume: this.musicVolume });
      }

      // Warm, audible Christmas music box: normal (0.36), ducked on explosion (0.12)
      const targetVol = this.musicDucked ? 0.12 : 0.36;
      const rate = targetVol < this.musicVolume ? 6 : 2.5;
      this.musicVolume += (targetVol - this.musicVolume) * Math.min(1, dt > 0 ? dt * rate : 0.1);
      this.musicSound.setVolume(this.musicVolume);
    }
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      if (this.musicSound?.isPlaying) {
        this.musicSound.pause();
      }
      this.musicVolume = 0;
    } else {
      this.tick(0);
    }
  }

  setPaused(value: boolean): void {
    this.paused = value;
    if (value) {
      if (this.musicSound?.isPlaying) {
        this.musicSound.pause();
      }
    } else {
      this.tick(0);
    }
  }

  setMusicDucked(ducked: boolean): void {
    this.musicDucked = ducked;
  }

  play(cue: LanternaAudioCue): void {
    if (!this.enabled || this.paused) return;

    const now = Date.now();
    const last = this.lastPlayTimes.get(cue) ?? 0;

    // Minimum intervals between triggers (debounce)
    const cooldowns: Record<LanternaAudioCue, number> = {
      ratchet: 45,
      snap: 120,
      star: 150,
      beam: 200,
      shutter: 400,
      celebrate: 1000,
      tap: 80,
      'charge-tick': 80,
      explosion: 800,
      'confetti-pop': 100,
      'bulb-clink': 70,
      'fireplace-crackle': 250,
      'hint-magic': 400,
    };

    if (now - last < cooldowns[cue]) return;
    this.lastPlayTimes.set(cue, now);

    // 1. First attempt Phaser sound playback for maximum acoustic warmth
    if (this.scene.sound && this.gestureUnlocked) {
      let phaserKey: string | null = null;
      let volume = 0.35;

      switch (cue) {
        case 'tap':
          phaserKey = 'lanterna-tap';
          volume = 0.3;
          break;
        case 'ratchet':
          phaserKey = 'lanterna-ratchet-real';
          volume = 0.42;
          break;
        case 'bulb-clink':
          phaserKey = 'lanterna-glass-clink';
          volume = 0.38;
          break;
        case 'hint-magic':
          phaserKey = 'lanterna-magic';
          volume = 0.5;
          break;
        case 'star':
          phaserKey = 'lanterna-magic';
          volume = 0.45;
          break;
        case 'celebrate':
          phaserKey = 'lanterna-celebrate-music';
          volume = 0.55;
          break;
        case 'shutter':
          phaserKey = 'lanterna-reveal';
          volume = 0.4;
          break;
        case 'snap':
          phaserKey = 'lanterna-bells';
          volume = 0.38;
          break;
      }

      if (phaserKey && this.scene.cache.audio.exists(phaserKey)) {
        try {
          this.scene.sound.play(phaserKey, { volume });
          if (cue === 'celebrate') {
            this.setMusicDucked(true);
            // Sleigh bells reinforcement
            if (this.scene.cache.audio.exists('lanterna-bells')) {
              this.scene.time.delayedCall(180, () => {
                this.scene.sound.play('lanterna-bells', { volume: 0.4 });
              });
            }
          }
          return;
        } catch {
          // Fall through to procedural WebAudio synthesis
        }
      }
    }

    // 2. Procedural WebAudio synthesis fallback
    this.playSynthesizedCue(cue);
  }

  private playSynthesizedCue(cue: LanternaAudioCue): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const t = ctx.currentTime;

    switch (cue) {
      case 'ratchet': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(820, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.025);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
        break;
      }
      case 'snap': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.06);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
        break;
      }
      case 'star': {
        // Pentatonic chime bell
        const freqs = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t + idx * 0.03);
          gain.gain.setValueAtTime(0.12, t + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28 + idx * 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.03);
          osc.stop(t + 0.3);
        });
        break;
      }
      case 'beam': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, t);
        osc.frequency.linearRampToValueAtTime(370, t + 0.12);
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);
        break;
      }
      case 'shutter': {
        // Dual-action mechanical camera shutter clack
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(1300, t);
        osc1.frequency.exponentialRampToValueAtTime(160, t + 0.035);
        gain1.gain.setValueAtTime(0.22, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.04);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(950, t + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(210, t + 0.09);
        gain2.gain.setValueAtTime(0.26, t + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t + 0.05);
        osc2.stop(t + 0.1);
        break;
      }
      case 'celebrate': {
        this.setMusicDucked(true);
        const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        chord.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t + idx * 0.06);
          gain.gain.setValueAtTime(0.14, t + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.06);
          osc.stop(t + 0.7);
        });
        break;
      }
      case 'tap': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.04);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
      }
      case 'charge-tick': {
        this.playChargeTick(5);
        break;
      }
      case 'explosion': {
        this.playExplosion();
        break;
      }
      case 'confetti-pop': {
        this.playConfettiPop();
        break;
      }
      case 'bulb-clink': {
        this.playBulbChime(0);
        break;
      }
      case 'fireplace-crackle': {
        this.playFireplaceTouch();
        break;
      }
      case 'hint-magic': {
        this.play('star');
        break;
      }
    }
  }

  playBulbChime(pitchIndex = 0): void {
    if (!this.enabled || this.paused) return;

    // Pentatonic frequencies for crystal glass bulbs: G5, A5, C6, D6, E6, G6
    const freqs = [783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98];
    const freq = freqs[pitchIndex % freqs.length]!;

    if (this.scene.sound && this.gestureUnlocked) {
      if (this.scene.cache.audio.exists('lanterna-glass-clink')) {
        try {
          this.scene.sound.play('lanterna-glass-clink', {
            volume: 0.35,
            detune: (pitchIndex % freqs.length) * 100,
          });
          return;
        } catch {
          // Fallback
        }
      }
    }

    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch {
      // Fallback
    }
  }

  playFireplaceTouch(): void {
    if (!this.enabled || this.paused) return;
    if (this.scene.sound && this.gestureUnlocked && this.scene.cache.audio.exists('lanterna-tap')) {
      try {
        this.scene.sound.play('lanterna-tap', { volume: 0.25 });
      } catch {
        // Fallback
      }
    }
    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.05);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    } catch {
      // Fallback
    }
  }

  playRatchet(): void {
    this.play('ratchet');
  }

  playHintMagic(): void {
    this.play('hint-magic');
  }

  playHollyRustle(): void {
    if (!this.enabled || this.paused) return;
    if (
      this.scene.sound &&
      this.gestureUnlocked &&
      this.scene.cache.audio.exists('lanterna-bells-b')
    ) {
      try {
        this.scene.sound.play('lanterna-bells-b', { volume: 0.3 });
        return;
      } catch {
        // Fallback
      }
    }
    this.play('tap');
  }

  playChargeTick(digit: number): void {
    if (!this.enabled || this.paused) return;

    // Ascending notes for countdown: 5 -> C5, 4 -> D5, 3 -> E5, 2 -> G5, 1 -> C6
    const digitFreqs: Record<number, number> = {
      5: 523.25, // C5
      4: 587.33, // D5
      3: 659.25, // E5
      2: 783.99, // G5
      1: 1046.5, // C6
    };

    const freq = digitFreqs[digit] ?? 659.25;

    if (
      this.scene.sound &&
      this.gestureUnlocked &&
      this.scene.cache.audio.exists('lanterna-bells')
    ) {
      try {
        this.scene.sound.play('lanterna-bells', { volume: 0.28 });
      } catch {
        // Fallback
      }
    }

    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // Pure crystal harmonic bell / chime
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(freq * 2.76, t); // Metallic overtone

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.3, t);
      oscHarmonic.connect(harmGain);
      harmGain.connect(gain);

      osc.connect(gain);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      gain.connect(ctx.destination);

      osc.start(t);
      oscHarmonic.start(t);
      osc.stop(t + 0.4);
      oscHarmonic.stop(t + 0.4);
    } catch {
      // Fallback
    }
  }

  playExplosion(): void {
    if (!this.enabled || this.paused) return;

    if (this.scene.sound && this.gestureUnlocked) {
      if (this.scene.cache.audio.exists('lanterna-reveal')) {
        try {
          this.scene.sound.play('lanterna-reveal', { volume: 0.5 });
        } catch {
          // Fallback
        }
      }
      if (this.scene.cache.audio.exists('lanterna-open')) {
        try {
          this.scene.sound.play('lanterna-open', { volume: 0.45 });
        } catch {
          // Fallback
        }
      }
    }

    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // 1. Deep photographic sub-bass boom (85Hz down to 24Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(85, t);
      subOsc.frequency.exponentialRampToValueAtTime(24, t + 0.45);

      subGain.gain.setValueAtTime(0.4, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 0.52);

      // 2. High-energy photographic flash pop & noise dispersion
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1200, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(250, t + 0.18);
      noiseFilter.Q.setValueAtTime(1.5, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start(t);

      // 3. Shimmering triumphant crystal burst
      const chord = [783.99, 1046.5, 1318.51, 1567.98]; // G5, C6, E6, G6
      chord.forEach((note, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, t + 0.04 + idx * 0.03);
        gain.gain.setValueAtTime(0.12, t + 0.04 + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55 + idx * 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + 0.04 + idx * 0.03);
        osc.stop(t + 0.6 + idx * 0.03);
      });
    } catch {
      // Fallback
    }
  }

  playConfettiPop(): void {
    if (!this.enabled || this.paused || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // Crisp festive confetti cracker snap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.06);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Fallback
    }
  }

  destroy(): void {
    this.isDisposed = true;

    if (this.musicSound) {
      try {
        this.musicSound.stop();
        this.musicSound.destroy();
      } catch {
        // Sound cleanup fallback
      }
      this.musicSound = null;
    }

    if (this.celebrateSound) {
      try {
        this.celebrateSound.stop();
        this.celebrateSound.destroy();
      } catch {
        // Sound cleanup fallback
      }
      this.celebrateSound = null;
    }

    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => {
        // Close context cleanup
      });
      this.audioCtx = null;
    }
    this.lastPlayTimes.clear();
  }
}
