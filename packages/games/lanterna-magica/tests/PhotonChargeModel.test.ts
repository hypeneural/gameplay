import { describe, expect, it } from 'vitest';
import { PhotonChargeModel } from '../src/domain/PhotonChargeModel.js';

describe('PhotonChargeModel', () => {
  it('initializes with 0 charge and 5 seconds remaining', () => {
    const model = new PhotonChargeModel({ totalDurationSec: 5.0 });
    const snap = model.getSnapshot();

    expect(snap.chargeProgress).toBe(0);
    expect(snap.remainingSeconds).toBe(5.0);
    expect(snap.displayDigit).toBe(5);
    expect(snap.isCharging).toBe(false);
    expect(snap.isOvercharged).toBe(false);
  });

  it('increments charge when light beam is hitting target', () => {
    const model = new PhotonChargeModel({ totalDurationSec: 5.0 });

    // After 1 second: 4s remaining -> displayDigit 4
    let snap = model.update(1.0, true);
    expect(snap.chargeProgress).toBeCloseTo(0.2);
    expect(snap.remainingSeconds).toBeCloseTo(4.0);
    expect(snap.displayDigit).toBe(4);
    expect(snap.isCharging).toBe(true);
    expect(snap.isOvercharged).toBe(false);

    // After 2 more seconds (total 3s): 2s remaining -> displayDigit 2
    snap = model.update(2.0, true);
    expect(snap.chargeProgress).toBeCloseTo(0.6);
    expect(snap.remainingSeconds).toBeCloseTo(2.0);
    expect(snap.displayDigit).toBe(2);

    // After 1.5 more seconds (total 4.5s): 0.5s remaining -> displayDigit 1
    snap = model.update(1.5, true);
    expect(snap.chargeProgress).toBeCloseTo(0.9);
    expect(snap.displayDigit).toBe(1);
  });

  it('reaches overcharge at 5.0 seconds and signals explosion', () => {
    const model = new PhotonChargeModel({ totalDurationSec: 5.0 });

    model.update(5.0, true);
    const snap = model.getSnapshot();

    expect(snap.chargeProgress).toBe(1.0);
    expect(snap.remainingSeconds).toBe(0);
    expect(snap.displayDigit).toBe(0);
    expect(snap.isOvercharged).toBe(true);
  });

  it('decays gently when beam is interrupted and allows resuming', () => {
    // 20% decay per second
    const model = new PhotonChargeModel({ totalDurationSec: 5.0, decayRatePerSec: 0.2 });

    // Charge to 3.0s (60%)
    model.update(3.0, true);
    expect(model.chargeProgress).toBeCloseTo(0.6);

    // Beam lost for 1 second: loses 0.2 * 5.0 = 1.0s of charge -> remains at 2.0s (40%)
    const unlitSnap = model.update(1.0, false);
    expect(unlitSnap.chargeProgress).toBeCloseTo(0.4);
    expect(unlitSnap.isCharging).toBe(false);
    expect(unlitSnap.remainingSeconds).toBeCloseTo(3.0);
    expect(unlitSnap.displayDigit).toBe(3);

    // Realign beam for 3.0 seconds -> reaches 5.0s (100%)
    const fullSnap = model.update(3.0, true);
    expect(fullSnap.chargeProgress).toBe(1.0);
    expect(fullSnap.isOvercharged).toBe(true);
    expect(fullSnap.displayDigit).toBe(0);
  });

  it('resets cleanly', () => {
    const model = new PhotonChargeModel({ totalDurationSec: 5.0 });
    model.update(3.0, true);
    expect(model.chargeProgress).toBeGreaterThan(0);

    model.reset();
    expect(model.chargeProgress).toBe(0);
    expect(model.displayDigit).toBe(5);
    expect(model.isOvercharged).toBe(false);
  });
});
