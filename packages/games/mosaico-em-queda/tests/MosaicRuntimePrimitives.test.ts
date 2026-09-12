import { describe, expect, it } from 'vitest';
import {
  MosaicFixedStepClock,
  MosaicDockInput,
  MosaicGestureInput,
  MosaicInputLatch,
  MosaicPointerOwnership,
  MosaicTechnicalProbe,
  resolveMosaicViewport,
  MOSAIC_FIXED_STEP_MS,
  MOSAIC_MAX_STEPS_PER_PRESENTATION,
} from '../src/index.js';

describe('Mosaico runtime technical primitives', () => {
  it('caps catch-up work and discards elapsed time at a lifecycle reset', () => {
    const clock = new MosaicFixedStepClock();
    let steps = 0;

    expect(clock.advance(MOSAIC_FIXED_STEP_MS * 20, () => (steps += 1))).toBe(
      MOSAIC_MAX_STEPS_PER_PRESENTATION,
    );
    expect(steps).toBe(MOSAIC_MAX_STEPS_PER_PRESENTATION);
    expect(clock.pendingMs).toBe(0);
    clock.advance(MOSAIC_FIXED_STEP_MS / 2, () => (steps += 1));
    clock.reset();
    expect(clock.advance(MOSAIC_FIXED_STEP_MS / 2, () => (steps += 1))).toBe(0);
  });

  it('gives one pointer authority, clears held input on cancellation, and consumes edges once', () => {
    const ownership = new MosaicPointerOwnership();
    const input = new MosaicInputLatch();

    expect(ownership.tryAcquire(11, 'dock')).toBe(true);
    input.pressLeft();
    expect(input.consumeFrame()).toMatchObject({ leftPressed: true, leftHeld: true });
    expect(input.consumeFrame()).toMatchObject({ leftPressed: false, leftHeld: true });
    expect(ownership.tryAcquire(12, 'gesture')).toBe(false);
    input.clear();
    expect(ownership.owner).toBeNull();
    expect(input.consumeFrame()).toEqual({
      leftHeld: false,
      leftPressed: false,
      rightHeld: false,
      rightPressed: false,
      rotateCWPressed: false,
      softDropPressed: false,
    });
  });

  it('confirms a dock command only for its first eligible pointer', () => {
    const ownership = new MosaicPointerOwnership();
    const input = new MosaicInputLatch();
    const dock = new MosaicDockInput(ownership, input);

    expect(dock.press('rotate-cw', { pointerId: 4, wasCanceled: false })).toBe(true);
    expect(input.consumeFrame()).toMatchObject({ rotateCWPressed: true });
    expect(dock.press('down', { pointerId: 5, wasCanceled: false })).toBe(false);
    expect(ownership.owner).toBeNull();
    expect(input.consumeFrame()).toMatchObject({ softDropPressed: false });
  });

  it('quantizes mural drag by cell, caps commands and reserves tap rotation for the active piece', () => {
    const gesture = new MosaicGestureInput();
    const owner = { pointerId: 8, epoch: 3 };
    gesture.begin(owner, 100, 100, true);

    expect(gesture.move(owner, 108, 100, 40)).toEqual([]);
    expect(gesture.move(owner, 30, 102, 40)).toEqual(['left', 'left']);
    expect(gesture.move(owner, -100, 102, 40)).toHaveLength(3);
    expect(gesture.move({ ...owner, epoch: 4 }, 100, 70, 40)).toEqual([]);
    expect(gesture.end(owner)).toBe(false);

    gesture.begin(owner, 100, 100, true);
    expect(gesture.end(owner)).toBe(true);
    gesture.begin(owner, 100, 100, false);
    expect(gesture.end(owner)).toBe(false);
  });

  it('bounds the presentation area and records only local runtime counters', () => {
    const callbacks = new Map<number, (timestampMs: number) => void>();
    let nextRequest = 0;
    const probe = new MosaicTechnicalProbe(
      {
        cancelFrame: (requestId) => callbacks.delete(requestId),
        requestFrame: (callback) => {
          nextRequest += 1;
          callbacks.set(nextRequest, callback);
          return nextRequest;
        },
      },
      'NORMAL',
    );
    probe.start();
    const firstFrame = callbacks.get(1);
    callbacks.delete(1);
    firstFrame?.(100);
    const secondFrame = callbacks.get(2);
    callbacks.delete(2);
    secondFrame?.(118);
    probe.recordPresentationDelta(18);
    probe.recordContextLoss();

    expect(
      resolveMosaicViewport({
        scaleWidth: 430,
        scaleHeight: 932,
        visualViewportWidth: 430,
        visualViewportHeight: 840,
      }),
    ).toMatchObject({ width: 430, height: 840 });
    expect(
      probe.snapshot({
        canvasCount: 1,
        decodedTextureBytes: 0,
        textureCount: 0,
        presenterCount: 0,
        effectCount: 0,
        runTextureCount: 0,
      }),
    ).toMatchObject({
      contextLossCount: 1,
      frameBudget: { measuredFrames: 1 },
      frames: { sampleCount: 1 },
    });
    probe.pause();
    expect(callbacks.size).toBe(0);
    probe.resume();
    expect(callbacks.size).toBe(1);
    probe.stop();
    expect(callbacks.size).toBe(0);
  });
});
