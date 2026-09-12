import { describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { RudolphAudioDirector } from '../src/runtime/phaser/RudolphAudioDirector.js';

function setup() {
  const voices = new Map<string, ReturnType<typeof voice>>();
  function voice() {
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
        const value = voice();
        voices.set(key, value);
        return value;
      }),
    },
    cache: { audio: { exists: () => true } },
    time: { now: 1000 },
  };
  return {
    scene,
    voices,
    director: new RudolphAudioDirector(scene as unknown as Phaser.Scene, true),
  };
}

describe('Rudolph audio ownership and mix', () => {
  it('waits for a gesture and protects capture from lower priority noise', () => {
    const { director, scene, voices } = setup();
    director.play('catch');
    director.tick(1);
    expect(scene.sound.add).not.toHaveBeenCalled();
    director.unlock();
    director.tick(1);
    director.play('catch');
    scene.time.now += 200;
    director.play('snow');
    expect(voices.has('rudolph-snow-v1')).toBe(false);
    const music = voices.get('rudolph-winter-loop-v1')!;
    director.tick(1);
    expect(music.volume).toBeCloseTo(0.075);
    voices.get('rudolph-encaixe')!.isPlaying = false;
    director.tick(1);
    expect(music.volume).toBeCloseTo(0.22);
  });
  it('preserves pause, has no stale cues after mute, and destroys all owned voices', () => {
    const { director, scene, voices } = setup();
    director.unlock();
    director.tick(1);
    director.play('catch');
    const music = voices.get('rudolph-winter-loop-v1')!;
    director.setPaused(true);
    expect(music.isPaused).toBe(true);
    director.play('magic');
    expect(voices.has('rudolph-magic-v1')).toBe(false);
    director.setEnabled(false);
    director.setPaused(false);
    director.tick(1);
    expect(music.isPlaying).toBe(false);
    director.setEnabled(true);
    director.tick(1);
    expect(music.isPlaying).toBe(true);
    expect(voices.get('rudolph-encaixe')!.play).toHaveBeenCalledTimes(1);
    scene.time.now += 200;
    director.play('finish');
    director.tick(1);
    expect(music.isPlaying).toBe(false);
    director.destroy();
    director.unlock();
    director.tick(1);
    director.play('tap');
    for (const owned of voices.values()) {
      expect(owned.isPlaying).toBe(false);
      expect(owned.destroy).toHaveBeenCalledTimes(1);
    }
  });
});
