import { describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { EstilingueAudioDirector } from '../src/runtime/phaser/EstilingueAudioDirector.js';

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
      setVolume: vi.fn((val: number) => {
        sound.volume = val;
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
    time: {
      now: 1000,
    },
  };

  return {
    scene,
    voices,
    director: new EstilingueAudioDirector(scene as unknown as Phaser.Scene, true),
  };
}

describe('EstilingueAudioDirector', () => {
  it('waits for gesture unlock before playing sound', () => {
    const { director, scene, voices } = setup();
    director.play('wood');
    director.tick(1);
    expect(scene.sound.add).not.toHaveBeenCalled();

    director.unlock();
    director.tick(1);
    director.play('wood');
    expect(voices.has('estilingue-impact-wood-v1')).toBe(true);
  });

  it('ducks background music when a sound effect is playing', () => {
    const { director, voices } = setup();
    director.unlock();
    director.tick(1);

    // Music should start
    const music = voices.get('estilingue-winter-loop-v1')!;
    expect(music).toBeDefined();

    // Trigger hit sound
    director.play('bell');
    director.tick(1);

    // Ducked volume target is 0.05
    expect(music.volume).toBeCloseTo(0.05, 1);

    // Sound completes
    voices.get('estilingue-impact-bell-v1')!.isPlaying = false;
    director.tick(1);

    // Unducked volume target is 0.18
    expect(music.volume).toBeCloseTo(0.18, 1);
  });

  it('handles pause and resume cleanly', () => {
    const { director, voices } = setup();
    director.unlock();
    director.tick(1);

    const music = voices.get('estilingue-winter-loop-v1')!;
    director.setPaused(true);
    expect(music.isPaused).toBe(true);

    director.setPaused(false);
    director.tick(1);
    expect(music.isPaused).toBe(false);
  });

  it('stops music and cues on destroy', () => {
    const { director, voices } = setup();
    director.unlock();
    director.tick(1);
    director.play('wood');

    director.destroy();
    expect(voices.get('estilingue-winter-loop-v1')!.destroy).toHaveBeenCalled();
  });
});
