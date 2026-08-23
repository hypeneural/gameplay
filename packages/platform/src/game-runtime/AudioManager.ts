export type AudioChannel = 'music' | 'sfx';

export interface AudioPort {
  /** Phaser adapters return false while the engine handles browser unlocking. */
  isReady?(): boolean;
  play(cue: string, options: { channel: AudioChannel; volume: number }): Promise<void>;
  stop?(channel: AudioChannel): Promise<void>;
}

/**
 * Keeps product preferences separate from a concrete Phaser SoundManager
 * adapter. Phaser owns browser autoplay unlocking and queued playback.
 */
export class AudioManager {
  private muted = false;
  private readonly volumes: Record<AudioChannel, number> = { music: 0.45, sfx: 0.8 };

  constructor(private readonly port: AudioPort) {}

  isReady(): boolean {
    return this.port.isReady?.() ?? true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setVolume(channel: AudioChannel, volume: number): void {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new Error('Audio volume must be between 0 and 1.');
    }
    this.volumes[channel] = volume;
  }

  async play(cue: string, channel: AudioChannel = 'sfx'): Promise<boolean> {
    if (this.muted) return false;
    await this.port.play(cue, { channel, volume: this.volumes[channel] });
    return true;
  }

  async stop(channel: AudioChannel): Promise<void> {
    await this.port.stop?.(channel);
  }
}
