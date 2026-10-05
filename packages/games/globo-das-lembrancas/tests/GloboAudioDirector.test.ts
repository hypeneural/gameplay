import { describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { GloboAudioDirector } from '../src/runtime/phaser/GloboAudioDirector.js';

function setup() {
  const voices = new Map<string, ReturnType<typeof createMockVoice>>();

  function createMockVoice() {
    const sound = {
      isPlaying: false,
      isPaused: false,
      volume: 0,
      play: vi.fn(() => {
        sound.isPlaying = true;
        sound.isPaused = false;
        return true;
      }),
      stop: vi.fn(() => {
        sound.isPlaying = false;
        sound.isPaused = false;
        return true;
      }),
      pause: vi.fn(() => {
        sound.isPlaying = false;
        sound.isPaused = true;
        return true;
      }),
      resume: vi.fn(() => {
        sound.isPlaying = true;
        sound.isPaused = false;
        return true;
      }),
      setVolume: vi.fn((value: number) => {
        sound.volume = value;
      }),
      destroy: vi.fn(),
    };
    return sound;
  }

  const scene = {
    sound: {
      locked: false,
      unlock: vi.fn(),
      add: vi.fn((key: string) => {
        const value = createMockVoice();
        voices.set(key, value);
        return value;
      }),
    },
    cache: {
      audio: {
        exists: () => true,
      },
    },
    time: { now: 1000 },
  };

  return {
    scene,
    voices,
    director: new GloboAudioDirector(scene as unknown as Phaser.Scene, true),
  };
}

describe('GloboAudioDirector sound ownership and mix', () => {
  it('waits for unlock gesture before playing audio', () => {
    const { director, scene, voices } = setup();

    director.play('glass-clink');
    director.tick(1);
    expect(scene.sound.add).not.toHaveBeenCalled();

    director.unlock();
    director.tick(1);
    // Background music initialized
    expect(voices.has('globo-musicbox-loop')).toBe(true);

    director.play('glass-clink');
    expect(voices.has('globo-glass-clink')).toBe(true);
    expect(voices.get('globo-glass-clink')!.play).toHaveBeenCalledTimes(1);
  });

  it('protects high priority cues from being overridden by lower priority cues', () => {
    const { director, scene, voices } = setup();
    director.unlock();
    director.tick(1);

    // Chime note has priority 2
    director.play('chime-note');
    expect(voices.has('globo-chime-note')).toBe(true);

    // Steam wipe has priority 0 - should be rejected while chime note is playing
    director.play('steam-wipe');
    expect(voices.has('globo-steam-wipe')).toBe(false);

    // After chime note stops, lower priority can play (after cooldown)
    voices.get('globo-chime-note')!.isPlaying = false;
    scene.time.now += 150;
    director.play('steam-wipe');
    expect(voices.has('globo-steam-wipe')).toBe(true);
  });

  it('ducks background music during priority >= 2 cue playback', () => {
    const { director, voices } = setup();
    director.unlock();
    director.tick(1);

    const music = voices.get('globo-musicbox-loop')!;
    // Initially ticks towards 0.22
    director.tick(1);
    expect(music.volume).toBeCloseTo(0.22, 1);

    // Trigger priority 2 chime note
    director.play('chime-note');
    director.tick(1);
    // Volume should duck down towards 0.08
    expect(music.volume).toBeLessThan(0.15);

    // End chime note
    voices.get('globo-chime-note')!.isPlaying = false;
    director.tick(1);
    expect(music.volume).toBeGreaterThan(0.18);
  });

  it('handles pause, unpause, mute, celebrate, and full cleanup', () => {
    const { director, scene, voices } = setup();
    director.unlock();
    director.tick(1);

    const music = voices.get('globo-musicbox-loop')!;

    // Pause
    director.setPaused(true);
    expect(music.pause).toHaveBeenCalled();

    // Mute
    director.setEnabled(false);
    director.setPaused(false);
    director.tick(1);
    expect(music.isPlaying).toBe(false);

    // Unmute
    director.setEnabled(true);
    director.tick(1);
    expect(music.isPlaying).toBe(true);

    // Celebrate cue stops the background loop permanently
    scene.time.now += 200;
    director.play('musicbox-celebrate');
    expect(music.stop).toHaveBeenCalled();

    // Destroy
    director.destroy();
    for (const voice of voices.values()) {
      expect(voice.destroy).toHaveBeenCalled();
    }
  });
});
