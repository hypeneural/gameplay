import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class AudioMock {
  static instances: AudioMock[] = [];
  static result: Promise<void> | undefined;
  readonly pause = vi.fn();
  readonly play = vi.fn<() => Promise<void>>(() => AudioMock.result ?? Promise.resolve());
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  preload = '';
  currentTime = 0;
  volume = 1;
  constructor(public src: string) {
    AudioMock.instances.push(this);
  }
}

describe('shell sound direction', () => {
  let time = 0;
  beforeEach(() => {
    AudioMock.instances = [];
    AudioMock.result = undefined;
    time = 0;
    vi.resetModules();
    vi.stubGlobal('Audio', AudioMock);
    vi.spyOn(performance, 'now').mockImplementation(() => time);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not create audio until a gesture and maps photos to varied paper sounds', async () => {
    const { playInterfaceTap } = await import('./playInterfaceTap.js');
    expect(AudioMock.instances).toHaveLength(0);
    playInterfaceTap('photo');
    expect(AudioMock.instances[0]?.src).toMatch(/paper-a-v1.mp3$/);
    playInterfaceTap('photo');
    expect(AudioMock.instances[1]?.src).toMatch(/paper-b-v1.mp3$/);
    expect(AudioMock.instances[0]?.pause).toHaveBeenCalledOnce();
    expect(AudioMock.instances[1]?.volume).toBeLessThan(0.3);
  });

  it('reuses a bounded voice and suppresses repeated bells until the next deliberate gesture', async () => {
    const { playInterfaceTap } = await import('./playInterfaceTap.js');
    for (let i = 0; i < 50; i++) playInterfaceTap('bells');
    expect(AudioMock.instances).toHaveLength(1);
    expect(AudioMock.instances[0]?.play).toHaveBeenCalledOnce();
    time = 400;
    playInterfaceTap('bells');
    expect(AudioMock.instances).toHaveLength(2);
    expect(AudioMock.instances[0]?.pause).toHaveBeenCalledOnce();
    time = 800;
    playInterfaceTap('bells');
    expect(AudioMock.instances).toHaveLength(2);
    expect(AudioMock.instances[0]?.play).toHaveBeenCalledTimes(2);
  });

  it('mutes immediately, blocks new voices and can be turned on again', async () => {
    const { playInterfaceTap, setInterfaceSoundEnabled } = await import('./playInterfaceTap.js');
    playInterfaceTap();
    const sound = AudioMock.instances[0]!;
    setInterfaceSoundEnabled(false);
    playInterfaceTap('open');
    expect(sound.pause).toHaveBeenCalledOnce();
    expect(AudioMock.instances).toHaveLength(1);
    setInterfaceSoundEnabled(true);
    playInterfaceTap();
    expect(AudioMock.instances).toHaveLength(1);
    expect(sound.play).toHaveBeenCalledTimes(2);
  });

  it('restarts a cached sound from the beginning after it has finished', async () => {
    const { playInterfaceTap } = await import('./playInterfaceTap.js');
    playInterfaceTap('open');
    const sound = AudioMock.instances[0]!;
    sound.currentTime = 0.64;
    sound.onended?.();
    playInterfaceTap('open');
    expect(sound.currentTime).toBe(0);
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(AudioMock.instances).toHaveLength(1);
  });

  it('tries the alternative format only once when the first source fails', async () => {
    const { playInterfaceTap } = await import('./playInterfaceTap.js');
    playInterfaceTap('open');
    const sound = AudioMock.instances[0]!;
    sound.onerror?.();
    expect(sound.src).toMatch(/open-v1.m4a$/);
    expect(sound.play).toHaveBeenCalledTimes(2);
    sound.onerror?.();
    expect(sound.play).toHaveBeenCalledTimes(2);
  });

  it('never starts a delayed fallback after mute or disposal', async () => {
    let reject!: (error: Error) => void;
    AudioMock.result = new Promise<void>((_, fail) => {
      reject = fail;
    });
    const { playInterfaceTap, setInterfaceSoundEnabled, disposeInterfaceAudio } =
      await import('./playInterfaceTap.js');
    playInterfaceTap();
    setInterfaceSoundEnabled(false);
    reject(new Error('delayed load failure'));
    await Promise.resolve();
    expect(AudioMock.instances[0]?.play).toHaveBeenCalledOnce();
    disposeInterfaceAudio();
    expect(AudioMock.instances[0]?.src).toBe('');
  });
});
