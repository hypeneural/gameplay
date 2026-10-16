import { describe, expect, it } from 'vitest';
import {
  ActiveGameClock,
  AudioManager,
  AssetLoader,
  FrameBudgetMonitor,
  GameBridge,
  GameRunController,
  HapticFeedback,
  PageVisibilityController,
  PresentationFrameSampler,
  SceneScope,
  bindLoaderProgress,
  createPhotoSurface,
  createTouchHitArea,
  estimateDecodedRgbaTextureBytes,
  summarizeFrameDeltas,
} from '../src/index.js';
import { MemoryAnalytics, noOpHaptics } from '../src/testing/fakes.js';

describe('ActiveGameClock and GameRunController', () => {
  it('does not resume a manual pause when the page becomes visible', () => {
    let now = 0;
    const run = new GameRunController(
      'generated-game',
      'run-pause-owners',
      new ActiveGameClock({ now: () => now }),
      new MemoryAnalytics(),
      new GameBridge(),
    );
    run.open();
    run.ready();
    run.start();
    now = 120;
    run.pause();
    run.pause('visibility');
    now = 2000;
    run.resume('visibility');
    expect(run.state).toBe('paused');
    expect(run.elapsedMs()).toBe(120);
    run.resume();
    expect(run.state).toBe('started');
    run.pause('visibility');
    run.pause();
    run.resume();
    expect(run.state).toBe('paused');
    run.resume('visibility');
    expect(run.state).toBe('started');
  });
  it('keeps mute changes ordered and local without changing a paused run or analytics', () => {
    const analytics = new MemoryAnalytics();
    const bridge = new GameBridge();
    const run = new GameRunController(
      'generated-game',
      'run-sound',
      new ActiveGameClock({ now: () => 0 }),
      analytics,
      bridge,
    );
    run.open();
    run.ready();
    run.start();
    run.pause();
    run.soundChanged(false);
    expect(bridge.latest(run.runId)).toMatchObject({
      type: 'GAME_SOUND_CHANGED',
      enabled: false,
      sequence: 5,
    });
    run.soundChanged(false);
    expect(bridge.latest(run.runId)?.sequence).toBe(5);
    expect(run.state).toBe('paused');
    expect(analytics.events).toHaveLength(4);
    run.exit();
    run.soundChanged(true);
    expect(bridge.latest(run.runId)?.type).toBe('GAME_EXITED');
  });
  it('keeps only the latest bridge event for an active run and releases it at teardown', () => {
    const clock = new ActiveGameClock({ now: () => 0 });
    const analytics = new MemoryAnalytics();
    const bridge = new GameBridge();
    const run = new GameRunController(
      'generated-game',
      'run-test-latest',
      clock,
      analytics,
      bridge,
    );

    run.open();
    run.ready();
    expect(bridge.latest('run-test-latest')?.type).toBe('GAME_READY');

    bridge.release('run-test-latest');
    expect(bridge.latest('run-test-latest')).toBeUndefined();
  });

  it('excludes hidden time and emits one ordered run', () => {
    let now = 100;
    const clock = new ActiveGameClock({ now: () => now });
    const analytics = new MemoryAnalytics();
    const bridge = new GameBridge();
    const events: string[] = [];
    bridge.subscribe((event) => events.push(event.type));
    const run = new GameRunController('generated-game', 'run-test-001', clock, analytics, bridge);

    run.open();
    now = 150;
    run.ready();
    run.start();
    run.interactionSettled();
    now = 650;
    run.pause();
    now = 5_650;
    run.resume();
    now = 5_900;
    expect(run.complete()).toBe(800);
    run.complete();
    run.exit();
    run.exit();

    expect(events).toEqual([
      'GAME_OPENED',
      'GAME_READY',
      'GAME_STARTED',
      'GAME_INTERACTION_SETTLED',
      'GAME_PAUSED',
      'GAME_RESUMED',
      'GAME_COMPLETED',
      'GAME_EXITED',
    ]);
    expect(analytics.events.map((event) => event.type)).toEqual([
      'GAME_OPENED',
      'GAME_READY',
      'GAME_STARTED',
      'GAME_PAUSED',
      'GAME_RESUMED',
      'GAME_COMPLETED',
      'GAME_EXITED',
    ]);
    expect(analytics.events.map((event) => event.runId)).toEqual(
      Array<string>(7).fill('run-test-001'),
    );
    expect(events).toHaveLength(8);
    expect(analytics.events.map((event) => event.sequence)).toEqual([1, 2, 3, 5, 6, 7, 8]);
  });

  it('stops an active clock without counting time after stop', () => {
    let now = 0;
    const clock = new ActiveGameClock({ now: () => now });
    clock.start();
    now = 10;
    clock.stop();
    now = 100;
    expect(clock.elapsedMs()).toBe(10);
  });

  it('bridges bounded asset diagnostics without turning them into analytics events', () => {
    const clock = new ActiveGameClock({ now: () => 0 });
    const analytics = new MemoryAnalytics();
    const bridge = new GameBridge();
    const events: string[] = [];
    bridge.subscribe((event) => events.push(event.type));
    const run = new GameRunController(
      'generated-game',
      'run-test-asset-001',
      clock,
      analytics,
      bridge,
    );

    run.open();
    run.assetRetry(1);
    run.assetFailed('photo-game-variant');
    expect(() => run.assetFailed('https://private.example/photo')).toThrow(
      'privacy-safe kebab-case codes',
    );
    run.exit();

    expect(events).toEqual(['GAME_OPENED', 'GAME_ASSET_RETRY', 'GAME_ASSET_FAILED', 'GAME_EXITED']);
    expect(analytics.events.map((event) => event.type)).toEqual(['GAME_OPENED', 'GAME_EXITED']);
  });

  it('publishes monotonic, quantized loadProgress in idle or opened states without starting the clock or polluting analytics', () => {
    let now = 500;
    const clock = new ActiveGameClock({ now: () => now });
    const analytics = new MemoryAnalytics();
    const bridge = new GameBridge();
    const bridgeEvents: Array<{ type: string; progress?: number; stage?: string }> = [];
    bridge.subscribe((event) => {
      if (event.type === 'GAME_LOAD_PROGRESS') {
        bridgeEvents.push({ type: event.type, progress: event.progress, stage: event.stage });
      } else {
        bridgeEvents.push({ type: event.type });
      }
    });
    const run = new GameRunController(
      'globo-das-lembrancas',
      'run-load-progress-idle',
      clock,
      analytics,
      bridge,
    );

    // Preload progress before run.open() (idle state)
    run.loadProgress(0.25, 'loading_assets');
    now = 900;
    expect(run.elapsedMs()).toBe(0); // Clock must not start during idle preload
    run.loadProgress(0.26, 'loading_assets'); // Quantized away (< 0.04 delta)
    run.loadProgress(0.1, 'loading_assets'); // Monotonic guard prevents regression
    run.loadProgress(0.6, 'loading_assets');
    run.loadProgress(0.96, 'preparing_scene');
    // Stage must not regress back to loading_assets once preparing_scene is reached
    run.loadProgress(0.98, 'loading_assets');

    // Open arrives in create() after preload completed
    run.open();
    now = 1_150;
    run.ready();
    // Late progress after ready must be ignored
    run.loadProgress(1, 'preparing_scene');
    run.start();
    now = 1_400;
    expect(run.complete()).toBe(500);

    expect(bridgeEvents).toEqual([
      { type: 'GAME_LOAD_PROGRESS', progress: 0.25, stage: 'loading_assets' },
      { type: 'GAME_LOAD_PROGRESS', progress: 0.6, stage: 'loading_assets' },
      { type: 'GAME_LOAD_PROGRESS', progress: 0.96, stage: 'preparing_scene' },
      { type: 'GAME_OPENED' },
      { type: 'GAME_READY' },
      { type: 'GAME_STARTED' },
      { type: 'GAME_COMPLETED' },
    ]);
    expect(analytics.events.map((e) => e.type)).toEqual([
      'GAME_OPENED',
      'GAME_READY',
      'GAME_STARTED',
      'GAME_COMPLETED',
    ]);
  });

  it('binds Phaser loader progress and detaches listeners cleanly on SceneScope dispose', () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const fakeLoader = {
      on(event: string, fn: (...args: unknown[]) => void) {
        listeners.set(event, fn);
        return this;
      },
      off(event: string, fn: (...args: unknown[]) => void) {
        if (listeners.get(event) === fn) listeners.delete(event);
        return this;
      },
    };
    const scope = new SceneScope();
    const bridge = new GameBridge();
    const recorded: Array<{ progress: number; stage: string }> = [];
    bridge.subscribe((event) => {
      if (event.type === 'GAME_LOAD_PROGRESS') {
        recorded.push({ progress: event.progress, stage: event.stage });
      }
    });
    const run = new GameRunController(
      'puzzle-swap',
      'run-loader-adapter',
      new ActiveGameClock({ now: () => 0 }),
      new MemoryAnalytics(),
      bridge,
    );

    bindLoaderProgress(fakeLoader, scope, run);
    expect(listeners.size).toBe(2);

    listeners.get('progress')?.(0.5);
    // COMPLETE can fire even with failed files: this is not "scene prepared".
    listeners.get('complete')?.(fakeLoader, 0, 2);
    expect(recorded).toEqual([{ progress: 0.475, stage: 'loading_assets' }]);
    listeners.get('progress')?.(1);
    listeners.get('complete')?.(fakeLoader, 3, 0);

    expect(recorded).toEqual([
      { progress: 0.475, stage: 'loading_assets' },
      { progress: 0.95, stage: 'loading_assets' },
      { progress: 0.96, stage: 'preparing_scene' },
    ]);

    scope.dispose();
    expect(listeners.size).toBe(0);
  });
});

describe('PageVisibilityController', () => {
  it('relays only visible and hidden document states and removes its listener', () => {
    let listener: (() => void) | undefined;
    const document = {
      visibilityState: 'visible',
      addEventListener: (_type: 'visibilitychange', callback: () => void) => {
        listener = callback;
      },
      removeEventListener: (_type: 'visibilitychange', callback: () => void) => {
        if (listener === callback) listener = undefined;
      },
    };
    const calls: string[] = [];
    const detach = new PageVisibilityController(document, {
      pause: () => calls.push('pause'),
      resume: () => calls.push('resume'),
    }).attach();

    document.visibilityState = 'hidden';
    listener?.();
    document.visibilityState = 'visible';
    listener?.();
    detach();

    expect(calls).toEqual(['resume', 'pause', 'resume']);
    expect(listener).toBeUndefined();
  });
});

describe('AssetLoader', () => {
  it('retries a transient failure and records the retry boundary', async () => {
    let calls = 0;
    const retries: number[] = [];
    const result = await new AssetLoader().load({
      retries: 1,
      retryDelayMs: 0,
      load: async () => {
        calls += 1;
        if (calls === 1) throw new Error('temporary network error');
        return 'asset-ready';
      },
      onRetry: (attempt) => retries.push(attempt),
    });

    expect(result).toEqual({ value: 'asset-ready', source: 'primary', attempts: 2 });
    expect(retries).toEqual([1]);
  });

  it('uses a deliberate fallback after primary retries are exhausted', async () => {
    const result = await new AssetLoader().load({
      retries: 0,
      load: async () => Promise.reject(new Error('not found')),
      fallback: async () => 'placeholder',
    });

    expect(result).toEqual({ value: 'placeholder', source: 'fallback', attempts: 1 });
  });
});

describe('photo surfaces and touch targets', () => {
  it('contains portrait and landscape photos without crop or stretch', () => {
    const frame = { x: 0, y: 0, width: 300, height: 240 };
    const portrait = createPhotoSurface({ aspectRatio: 5 / 7 }, frame);
    const landscape = createPhotoSurface({ aspectRatio: 7 / 5 }, frame);

    expect(portrait).toMatchObject({ fit: 'contain', isCropped: false });
    expect(portrait.photo).toMatchObject({ width: expect.closeTo(171.43), height: 240 });
    expect(landscape.photo).toMatchObject({ width: 300, height: expect.closeTo(214.29) });
  });

  it('expands a small control to a 52px child-facing target', () => {
    expect(createTouchHitArea({ x: 10, y: 20, width: 20, height: 24 })).toEqual({
      x: -6,
      y: 6,
      width: 52,
      height: 52,
    });
  });
});

describe('feedback and performance quality', () => {
  it('uses shared haptic meanings', async () => {
    const calls: string[] = [];
    const feedback = new HapticFeedback({
      impact: async (style) => {
        calls.push(style);
      },
    });
    await feedback.cue('tap');
    await feedback.cue('celebrate');
    expect(calls).toEqual(['light', 'heavy']);
    await expect(noOpHaptics.impact('medium')).resolves.toBeUndefined();
  });

  it('lets the Phaser audio adapter own autoplay unlocking while honoring mute', async () => {
    const calls: string[] = [];
    const audio = new AudioManager({
      isReady: () => false,
      play: async (cue) => {
        calls.push(cue);
      },
    });

    expect(audio.isReady()).toBe(false);
    await expect(audio.play('tap')).resolves.toBe(true);
    audio.setMuted(true);
    await expect(audio.play('muted')).resolves.toBe(false);
    expect(calls).toEqual(['tap']);
  });

  it('lowers quality once after an initial bad frame window', () => {
    const monitor = new FrameBudgetMonitor({
      initialTier: 'HIGH',
      sampleSize: 10,
      p95BudgetMs: 20,
    });
    for (let index = 0; index < 10; index += 1) monitor.record(30);
    expect(monitor.record(3)).toEqual({ tier: 'NORMAL', measuredFrames: 10, locked: true });
  });

  it('summarizes frame deltas with stable percentiles and excludes invalid samples', () => {
    expect(summarizeFrameDeltas([10, 12, 16, 20, 40, 80, 0, Number.NaN], 25)).toEqual({
      framesAboveThreshold: 2,
      p50Ms: 16,
      p95Ms: 80,
      p99Ms: 80,
      sampleCount: 6,
      thresholdMs: 25,
    });
  });

  it('uses presentation timestamps rather than a real clock and cancels the pending frame', () => {
    const callbacks = new Map<number, (timestampMs: number) => void>();
    let nextRequestId = 0;
    const sampler = new PresentationFrameSampler(
      {
        cancelFrame: (requestId) => callbacks.delete(requestId),
        requestFrame: (callback) => {
          nextRequestId += 1;
          callbacks.set(nextRequestId, callback);
          return nextRequestId;
        },
      },
      20,
    );
    const present = (timestampMs: number): void => {
      const entry = callbacks.entries().next().value as
        [number, (timestamp: number) => void] | undefined;
      if (!entry) throw new Error('Expected a scheduled presentation frame.');
      callbacks.delete(entry[0]);
      entry[1](timestampMs);
    };

    sampler.start();
    present(100);
    present(118);
    present(143);
    expect(sampler.stop()).toEqual({
      framesAboveThreshold: 1,
      p50Ms: 18,
      p95Ms: 25,
      p99Ms: 25,
      sampleCount: 2,
      thresholdMs: 20,
    });
    expect(callbacks.size).toBe(0);
    sampler.reset();
    expect(sampler.summary().sampleCount).toBe(0);
  });

  it('estimates decoded texture bytes conservatively as RGBA pixels', () => {
    expect(estimateDecodedRgbaTextureBytes({ width: 1024, height: 1536 })).toBe(6_291_456);
    expect(() => estimateDecodedRgbaTextureBytes({ width: 0, height: 16 })).toThrow(
      'texture width',
    );
  });
});

describe('SceneScope', () => {
  it('cleans all resources in reverse order even when one fails', () => {
    const scope = new SceneScope();
    const calls: string[] = [];
    scope.add(() => calls.push('first'));
    scope.add(() => {
      calls.push('second');
      throw new Error('expected cleanup failure');
    });
    scope.add(() => calls.push('third'));

    scope.dispose();
    scope.dispose();

    expect(calls).toEqual(['third', 'second', 'first']);
  });
});
