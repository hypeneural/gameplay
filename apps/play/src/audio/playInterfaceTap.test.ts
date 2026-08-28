import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class AudioMock {
  static instances: AudioMock[] = [];

  readonly addEventListener = vi.fn();
  readonly pause = vi.fn();
  readonly play = vi.fn<() => Promise<void>>().mockResolvedValue();
  preload = '';
  src: string;
  volume = 1;

  constructor(source: string) {
    this.src = source;
    AudioMock.instances.push(this);
  }
}

describe('playInterfaceTap', () => {
  beforeEach(() => {
    AudioMock.instances = [];
    vi.resetModules();
    vi.stubGlobal('Audio', AudioMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts one short response when a React-owned control is touched', async () => {
    const { playInterfaceTap } = await import('./playInterfaceTap.js');

    playInterfaceTap();

    expect(AudioMock.instances).toHaveLength(1);
    const sound = AudioMock.instances[0];
    expect(sound).toBeDefined();
    expect(sound?.src).toMatch(/^data:audio\/mpeg;base64,/);
    expect(sound?.preload).toBe('auto');
    expect(sound?.volume).toBe(0.18);
    expect(sound?.play).toHaveBeenCalledOnce();
    expect(sound?.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function), {
      once: true,
    });
  });

  it('stops the preceding shell response before starting another', async () => {
    const { playInterfaceTap } = await import('./playInterfaceTap.js');

    playInterfaceTap();
    const first = AudioMock.instances[0];
    playInterfaceTap();

    expect(first?.pause).toHaveBeenCalledOnce();
    expect(first?.src).toBe('');
    expect(AudioMock.instances).toHaveLength(2);
    expect(AudioMock.instances[1]?.play).toHaveBeenCalledOnce();
  });
});
