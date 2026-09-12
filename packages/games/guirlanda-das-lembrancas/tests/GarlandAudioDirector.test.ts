import { describe, expect, it, vi } from 'vitest';
import {
  GarlandAudioDirector,
  garlandAudio,
  type GarlandSoundCue,
} from '../src/runtime/phaser/audioAssets.js';

function createVoice() {
  const voice = {
    isPlaying: false,
    isPaused: false,
    play: vi.fn((_config: { volume: number; rate: number }) => {
      voice.isPlaying = true;
      voice.isPaused = false;
      return true;
    }),
    pause: vi.fn(() => {
      voice.isPaused = voice.isPlaying;
      voice.isPlaying = false;
      return voice.isPaused;
    }),
    resume: vi.fn(() => {
      voice.isPlaying = voice.isPaused;
      voice.isPaused = false;
      return voice.isPlaying;
    }),
    stop: vi.fn(() => {
      const wasActive = voice.isPlaying || voice.isPaused;
      voice.isPlaying = false;
      voice.isPaused = false;
      return wasActive;
    }),
    destroy: vi.fn(),
  };
  return voice;
}

function createHarness(initiallyEnabled = true) {
  let now = 0;
  const owned: ReturnType<typeof createVoice>[] = [];
  const unrelated = createVoice();
  unrelated.isPlaying = true;
  const manager = {
    locked: false,
    unlock: vi.fn(),
    add: vi.fn((_key: string) => {
      const voice = createVoice();
      owned.push(voice);
      return voice;
    }),
    pauseAll: vi.fn(() => unrelated.pause()),
    resumeAll: vi.fn(() => unrelated.resume()),
    stopByKey: vi.fn(() => unrelated.stop()),
  };
  const cache = { exists: vi.fn((_key: string) => true) };
  const director = new GarlandAudioDirector(manager, cache, () => now, initiallyEnabled);
  return {
    director,
    manager,
    cache,
    owned,
    unrelated,
    advance: (milliseconds = 200) => (now += milliseconds),
  };
}

describe('GarlandAudioDirector', () => {
  it('requires a gesture and never queues stale cues while the mobile manager is locked', () => {
    const { director, manager } = createHarness();
    director.play('press');
    expect(manager.add).not.toHaveBeenCalled();

    manager.locked = true;
    director.unlockAfterGesture();
    director.play('select');
    expect(manager.unlock).toHaveBeenCalledOnce();
    expect(manager.add).not.toHaveBeenCalled();

    manager.locked = false;
    expect(manager.add).not.toHaveBeenCalled();
    director.play('select');
    expect(manager.add).toHaveBeenCalledOnce();
  });

  it('unlocks an enable gesture without playing anything while muted', () => {
    const { director, manager } = createHarness(false);
    manager.locked = true;
    director.unlockAfterGesture();
    director.play('select');
    expect(manager.unlock).toHaveBeenCalledOnce();
    expect(manager.add).not.toHaveBeenCalled();
    manager.locked = false;
    director.setEnabled(true);
    expect(manager.add).not.toHaveBeenCalled();
    director.play('press');
    expect(manager.add).toHaveBeenCalledOnce();
  });

  it('pauses and resumes only its own voice, leaving other scenes audible', () => {
    const { director, owned, unrelated, manager } = createHarness();
    director.unlockAfterGesture();
    director.play('place');
    director.pause();
    director.pause();
    director.play('victory');
    expect(owned[0]?.isPaused).toBe(true);
    expect(owned[0]?.pause).toHaveBeenCalledOnce();
    expect(manager.add).toHaveBeenCalledOnce();
    expect(unrelated.isPlaying).toBe(true);
    director.resume();
    director.resume();
    expect(owned[0]?.resume).toHaveBeenCalledOnce();
    expect(owned[0]?.isPlaying).toBe(true);
    expect(manager.pauseAll).not.toHaveBeenCalled();
    expect(manager.resumeAll).not.toHaveBeenCalled();
  });

  it('mute clears a paused cue and cannot resurrect it on resume or enable', () => {
    const { director, owned, unrelated, manager } = createHarness();
    director.unlockAfterGesture();
    director.play('victory');
    director.pause();
    director.setEnabled(false);
    director.resume();
    director.setEnabled(true);
    expect(owned[0]?.isPlaying).toBe(false);
    expect(owned[0]?.isPaused).toBe(false);
    expect(owned[0]?.resume).not.toHaveBeenCalled();
    expect(unrelated.isPlaying).toBe(true);
    expect(manager.stopByKey).not.toHaveBeenCalled();
  });

  it('never overlaps its cues and protects contact and victory from decorative accents', () => {
    const { director, owned, manager, advance } = createHarness();
    director.unlockAfterGesture();
    director.play('select');
    director.play('place');
    expect(owned[0]?.isPlaying).toBe(false);
    expect(owned[1]?.isPlaying).toBe(true);
    advance();
    director.play('light-travel');
    director.play('box-open');
    director.play('hint');
    expect(owned[1]?.play).toHaveBeenCalledOnce();
    expect(manager.add).toHaveBeenCalledTimes(2);
    director.play('victory');
    director.play('place');
    director.play('press');
    expect(owned.filter((voice) => voice.isPlaying)).toHaveLength(1);
    expect(owned[2]?.isPlaying).toBe(true);
    expect(manager.add).toHaveBeenCalledTimes(3);
  });

  it('debounces repeated input, varies gently and deterministically, and reuses the source', () => {
    const { director, manager, owned, advance } = createHarness();
    director.unlockAfterGesture();
    for (let index = 0; index < 5; index += 1) {
      director.play('select');
      director.play('select');
      advance();
    }
    expect(manager.add).toHaveBeenCalledOnce();
    const rates = owned[0]?.play.mock.calls.map(([config]) => config.rate);
    expect(rates).toEqual([1.06, 1.072, 1.05, 1.066, 1.06]);
    expect(owned[0]?.play).toHaveBeenCalledTimes(5);
  });

  it('provides distinct semantic mixes from the three authorized sources', () => {
    const { director, manager, owned, advance } = createHarness();
    director.unlockAfterGesture();
    const cues: GarlandSoundCue[] = [
      'press',
      'select',
      'lift',
      'return',
      'box-open',
      'hint',
      'light-travel',
      'place',
      'victory',
    ];
    const mixes = cues.map((cue) => {
      for (const voice of owned) voice.isPlaying = false;
      director.play(cue);
      advance();
      const active = owned.find((voice) => voice.isPlaying);
      return active?.play.mock.lastCall?.[0];
    });
    expect(mixes.every((mix) => mix !== undefined && mix.volume > 0 && mix.volume <= 0.3)).toBe(
      true,
    );
    expect(new Set(mixes.map((mix) => JSON.stringify(mix))).size).toBe(cues.length);
    expect(manager.add.mock.calls.map(([key]) => key)).toEqual([
      garlandAudio.press.key,
      garlandAudio.place.key,
      garlandAudio.victory.key,
    ]);
  });

  it('keeps visual-only play possible when an audio source is unavailable or rejects playback', () => {
    const { director, cache, manager, owned } = createHarness();
    director.unlockAfterGesture();
    cache.exists.mockReturnValue(false);
    director.play('place');
    expect(manager.add).not.toHaveBeenCalled();
    cache.exists.mockReturnValue(true);
    manager.add.mockImplementationOnce(() => {
      const voice = createVoice();
      voice.play.mockImplementationOnce(() => false);
      owned.push(voice);
      return voice;
    });
    director.play('place');
    director.play('place');
    expect(owned[0]?.play).toHaveBeenCalledTimes(2);
    expect(owned[0]?.isPlaying).toBe(true);
  });

  it('destroys every owned source including paused ones exactly once and is inert after exit', () => {
    const { director, owned, manager, unrelated } = createHarness();
    director.unlockAfterGesture();
    director.play('select');
    director.play('place');
    director.play('victory');
    director.pause();
    director.destroy();
    director.destroy();
    director.resume();
    director.setEnabled(true);
    director.unlockAfterGesture();
    director.play('place');
    expect(owned).toHaveLength(3);
    for (const voice of owned) {
      expect(voice.isPlaying).toBe(false);
      expect(voice.isPaused).toBe(false);
      expect(voice.destroy).toHaveBeenCalledOnce();
      expect(voice.resume).not.toHaveBeenCalled();
    }
    expect(manager.add).toHaveBeenCalledTimes(3);
    expect(unrelated.isPlaying).toBe(true);
    expect(unrelated.destroy).not.toHaveBeenCalled();
  });
});
