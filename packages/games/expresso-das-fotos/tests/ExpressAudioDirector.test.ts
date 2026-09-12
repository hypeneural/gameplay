import { describe, expect, it, vi } from 'vitest';

import { ExpressAudioDirector } from '../src/runtime/phaser/ExpressAudioDirector.js';

describe('ExpressAudioDirector', () => {
  it('uses one retained rail sound and stops it for mute and teardown', () => {
    let isPaused = false;
    let isPlaying = false;
    const travelSound = {
      destroy: vi.fn(),
      get isPaused() {
        return isPaused;
      },
      get isPlaying() {
        return isPlaying;
      },
      pause: vi.fn(() => {
        isPaused = true;
        isPlaying = false;
      }),
      play: vi.fn(() => {
        isPaused = false;
        isPlaying = true;
      }),
      resume: vi.fn(() => {
        isPaused = false;
        isPlaying = true;
      }),
      stop: vi.fn(() => {
        isPaused = false;
        isPlaying = false;
      }),
    };
    const soundManager = {
      add: vi.fn(() => travelSound),
      play: vi.fn(() => true),
      stopByKey: vi.fn(),
    };
    let now = 0;
    const director = new ExpressAudioDirector(soundManager as never, () => now, true);

    director.play('toyWhistle');
    director.play('toyWhistle');
    expect(soundManager.play).toHaveBeenCalledTimes(1);
    expect(soundManager.play).toHaveBeenCalledWith('expresso-sfx-toy-whistle', { volume: 0.22 });

    director.startTravel();
    expect(soundManager.add).toHaveBeenCalledWith('expresso-sfx-rail-roll', {
      loop: true,
      volume: 0.11,
    });
    expect(travelSound.play).toHaveBeenCalledTimes(1);

    director.pauseTravel();
    director.startTravel();
    expect(travelSound.pause).toHaveBeenCalledTimes(1);
    expect(travelSound.resume).toHaveBeenCalledTimes(1);

    now = 800;
    director.play('toyWhistle');
    expect(soundManager.play).toHaveBeenCalledTimes(2);

    director.setSoundEnabled(false);
    expect(travelSound.stop).toHaveBeenCalledTimes(1);
    expect(soundManager.stopByKey).toHaveBeenCalledWith('expresso-sfx-toy-whistle');
    director.play('toyWhistle');
    expect(soundManager.play).toHaveBeenCalledTimes(2);
    director.destroy();
    expect(travelSound.destroy).toHaveBeenCalledTimes(1);
  });
});
