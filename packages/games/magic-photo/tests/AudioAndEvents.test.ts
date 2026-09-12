import { describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { AudioManager } from '../src/runtime/phaser/AudioManager.js';
import { MagicEventBus } from '../src/runtime/MagicEventBus.js';
import {
  ActiveGameClock,
  GameBridge,
  GameRunController,
  MemoryAnalytics,
} from '@christmas-games/platform';

function audioFixture() {
  const sounds: Array<ReturnType<typeof voice>> = [];
  function voice() {
    const sound = {
      isPlaying: false,
      volume: 0.075,
      play: vi.fn(() => {
        sound.isPlaying = true;
        return true;
      }),
      stop: vi.fn(() => {
        sound.isPlaying = false;
        return true;
      }),
      destroy: vi.fn(),
      setVolume: vi.fn((volume: number) => {
        sound.volume = volume;
      }),
    };
    return sound;
  }
  const scene = {
    time: { now: 0 },
    sound: {
      locked: false,
      unlock: vi.fn(),
      add: vi.fn(() => {
        const sound = voice();
        sounds.push(sound);
        return sound;
      }),
    },
    cache: { audio: { exists: () => true } },
  };
  return { scene, sounds, audio: new AudioManager(scene as unknown as Phaser.Scene, true, true) };
}

describe('audio lifecycle and event boundary', () => {
  it('requires a gesture, caps trail repetition, protects celebration and silences owned voices', () => {
    const { audio, scene, sounds } = audioFixture();
    expect(audio.play('tap')).toBe(false);
    expect(scene.sound.add).not.toHaveBeenCalled();
    audio.gesture();
    expect(audio.play('trail')).toBe(true);
    scene.time.now = 100;
    expect(audio.play('trail')).toBe(false);
    scene.time.now = 200;
    expect(audio.play('finale')).toBe(true);
    scene.time.now = 500;
    expect(audio.play('trail')).toBe(false);
    audio.pause();
    expect(sounds.every((sound) => !sound.isPlaying)).toBe(true);
    audio.gesture();
    expect(audio.play('tap')).toBe(false);
    audio.resume();
    audio.setEnabled(false);
    expect(sounds.every((sound) => !sound.isPlaying)).toBe(true);
    audio.setEnabled(true);
    audio.destroy();
    audio.destroy();
    expect(sounds.every((sound) => sound.destroy.mock.calls.length === 1)).toBe(true);
    audio.gesture();
    expect(audio.play('tap')).toBe(false);
  });
  it('does not queue stale cues while the browser remains locked', () => {
    const { audio, scene } = audioFixture();
    scene.sound.locked = true;
    audio.gesture();
    expect(scene.sound.unlock).toHaveBeenCalledTimes(1);
    expect(audio.play('open')).toBe(false);
    scene.sound.locked = false;
    audio.update();
    expect(scene.sound.add).toHaveBeenCalledTimes(1); // music only
  });
  it('unsubscribes local handlers and records bounded milestones without replacing the bridge event', () => {
    const bus = new MagicEventBus();
    const fn = vi.fn();
    const off = bus.subscribe(fn);
    bus.publish([{ type: 'STATE_ENTERED', state: 'INTRO', atMs: 0 }]);
    off();
    bus.publish([{ type: 'STATE_ENTERED', state: 'GIFT_IDLE', atMs: 1200 }]);
    expect(fn).toHaveBeenCalledTimes(1);
    const analytics = new MemoryAnalytics();
    const bridge = new GameBridge();
    const run = new GameRunController(
      'magic-photo',
      'test-run',
      new ActiveGameClock({ now: () => 0 }),
      analytics,
      bridge,
    );
    run.open();
    run.ready();
    run.start();
    run.milestone('gift-touch-1');
    run.milestone('gift-touch-1');
    run.milestone('/private/photo');
    expect(analytics.events.filter((e) => e.type === 'GAME_MILESTONE')).toHaveLength(1);
    expect(bridge.latest('test-run')?.type).toBe('GAME_STARTED');
    for (let i = 0; i < 100; i++) run.milestone(`point-${i}`);
    expect(analytics.events.filter((e) => e.type === 'GAME_MILESTONE')).toHaveLength(64);
    run.exit();
    run.milestone('after-exit');
    expect(analytics.events.filter((e) => e.type === 'GAME_MILESTONE')).toHaveLength(64);
  });
});
