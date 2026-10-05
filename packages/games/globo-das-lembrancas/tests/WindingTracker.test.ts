import { describe, expect, it } from 'vitest';
import { WindingTracker } from '../src/domain/WindingTracker.js';

describe('WindingTracker', () => {
  it('starts at zero progress and not fully wound', () => {
    const tracker = new WindingTracker();
    expect(tracker.progress).toBe(0);
    expect(tracker.turns).toBe(0);
    expect(tracker.isFullyWound).toBe(false);
  });

  it('records clockwise rotation and emits ratchet clicks at 45 degree intervals', () => {
    const tracker = new WindingTracker({ turnsRequired: 3, ratchetStepRad: Math.PI / 4 });

    // Initial touch establishes origin
    expect(tracker.rotate(0)).toBe(0);

    // Quarter turn clockwise (PI/2 rad = 90 deg = 2 ratchet clicks)
    const clicks = tracker.rotate(Math.PI / 2);
    expect(clicks).toBe(2);
    expect(tracker.turns).toBeCloseTo(0.25, 3);
    expect(tracker.progress).toBeCloseTo(0.25 / 3, 3);
    expect(tracker.isFullyWound).toBe(false);
  });

  it('rejects counter-clockwise rotation (ratchet prevents unwinding)', () => {
    const tracker = new WindingTracker();
    tracker.rotate(0);
    tracker.rotate(Math.PI / 2); // 90 deg clockwise
    const progress = tracker.progress;

    // Turn backwards (counter-clockwise)
    const reverseClicks = tracker.rotate(Math.PI / 4);
    expect(reverseClicks).toBe(0);
    expect(tracker.progress).toBe(progress); // unchanged
  });

  it('handles quadrant boundary wrapping from +PI to -PI cleanly', () => {
    const tracker = new WindingTracker();
    tracker.rotate(Math.PI * 0.9); // near +PI
    // Advance across boundary to -0.9*PI (clockwise movement of 0.2*PI)
    const clicks = tracker.rotate(-Math.PI * 0.9);
    expect(tracker.turns).toBeGreaterThan(0);
    expect(clicks).toBeGreaterThanOrEqual(0);
  });

  it('reaches 100% wound after turnsRequired rotations', () => {
    const tracker = new WindingTracker({ turnsRequired: 2 });
    tracker.rotate(0);

    // Rotate 2 full turns (4*PI rad) in 8 quarter-turns
    let totalClicks = 0;
    for (let i = 1; i <= 8; i++) {
      const angle = ((i * Math.PI) / 2) % (Math.PI * 2);
      // Normalized angle in (-PI, PI]
      const normAngle = angle > Math.PI ? angle - Math.PI * 2 : angle;
      totalClicks += tracker.rotate(normAngle);
    }

    expect(tracker.progress).toBe(1.0);
    expect(tracker.isFullyWound).toBe(true);
    expect(totalClicks).toBeGreaterThanOrEqual(16); // 16 ratchet clicks in 2 full turns
  });

  it('supports tapStep as an accessible alternative for young children', () => {
    const tracker = new WindingTracker({ turnsRequired: 2 });
    expect(tracker.tapStep()).toBeGreaterThanOrEqual(1);
    expect(tracker.turns).toBe(0.25);
    expect(tracker.progress).toBe(0.125);

    // 8 taps = 2 full turns = 100%
    for (let i = 0; i < 7; i++) {
      tracker.tapStep();
    }
    expect(tracker.progress).toBe(1.0);
    expect(tracker.isFullyWound).toBe(true);
    // Extra taps after 100% return 0
    expect(tracker.tapStep()).toBe(0);
  });

  it('increases mechanical resistance as the spring winds', () => {
    const tracker = new WindingTracker();
    expect(tracker.resistance).toBeCloseTo(0.35, 2); // loose
    tracker.tapStep();
    expect(tracker.resistance).toBeGreaterThan(0.35);
    for (let i = 0; i < 12; i++) tracker.tapStep();
    expect(tracker.resistance).toBeCloseTo(1.0, 2); // fully wound
  });

  it('permits slight mechanical backlash on reverse movement without unspooling progress', () => {
    const tracker = new WindingTracker();
    tracker.rotate(0);
    tracker.rotate(Math.PI / 4); // wind 45 deg
    const initialProgress = tracker.progress;

    // Slight counter-clockwise play
    tracker.rotate(Math.PI / 4 - 0.05);
    expect(tracker.backlash).toBeLessThan(0);
    expect(tracker.progress).toBe(initialProgress); // progress preserved!
  });
});
