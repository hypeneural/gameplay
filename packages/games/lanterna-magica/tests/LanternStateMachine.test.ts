import { describe, expect, it } from 'vitest';
import { LanternStateMachine } from '../src/domain/LanternStateMachine.js';
import { LANTERNA_PUZZLE_LEVELS, getLevelById } from '../src/domain/LanternPuzzleLevels.js';

describe('LanternStateMachine', () => {
  it('starts in BOOT and transitions to INTRO then READY', () => {
    const sm = new LanternStateMachine();
    expect(sm.state).toBe('BOOT');

    expect(sm.startIntro()).toBe(true);
    expect(sm.state).toBe('INTRO');

    expect(sm.becomeReady()).toBe(true);
    expect(sm.state).toBe('READY');
  });

  it('manages aiming and release', () => {
    const sm = new LanternStateMachine('READY');
    expect(sm.startAiming('mirror-1')).toBe(true);
    expect(sm.state).toBe('AIMING');
    expect(sm.activeMirrorId).toBe('mirror-1');

    expect(sm.finishAiming()).toBe(true);
    expect(sm.state).toBe('READY');
    expect(sm.activeMirrorId).toBe(null);
  });

  it('manages charging and interruption', () => {
    const sm = new LanternStateMachine('READY');
    expect(sm.startCharging()).toBe(true);
    expect(sm.state).toBe('CHARGING');

    expect(sm.interruptCharging()).toBe(true);
    expect(sm.state).toBe('READY');

    sm.startAiming('mirror-1');
    expect(sm.startCharging()).toBe(true);
    expect(sm.state).toBe('CHARGING');
    expect(sm.activeMirrorId).toBe('mirror-1');

    expect(sm.interruptCharging()).toBe(true);
    expect(sm.state).toBe('AIMING');

    expect(sm.startCharging()).toBe(true);
    expect(sm.illuminateTarget()).toBe(true);
    expect(sm.state).toBe('ILLUMINATED');
  });

  it('progresses to ILLUMINATED, PROJECTING and CELEBRATING on target hit', () => {
    const sm = new LanternStateMachine('READY');
    expect(sm.illuminateTarget()).toBe(true);
    expect(sm.state).toBe('ILLUMINATED');

    expect(sm.startProjection()).toBe(true);
    expect(sm.state).toBe('PROJECTING');

    expect(sm.celebrateVictory()).toBe(true);
    expect(sm.state).toBe('CELEBRATING');
  });

  it('handles pause and resume cleanly without state corruption', () => {
    const sm = new LanternStateMachine('READY');
    expect(sm.pause()).toBe(true);
    expect(sm.state).toBe('PAUSED');
    expect(sm.previousState).toBe('READY');

    expect(sm.resume()).toBe(true);
    expect(sm.state).toBe('READY');
  });

  it('notifies listeners on transition', () => {
    const sm = new LanternStateMachine('READY');
    const events: string[] = [];
    const unsubscribe = sm.onTransition((e) => {
      events.push(`${e.from}->${e.to}`);
    });

    sm.startAiming('mirror-2');
    sm.finishAiming();
    sm.illuminateTarget();

    expect(events).toEqual(['READY->AIMING', 'AIMING->READY', 'READY->ILLUMINATED']);

    unsubscribe();
    sm.startProjection();
    expect(events.length).toBe(3); // Unsubscribed, no extra event
  });
});

describe('LanternPuzzleLevels', () => {
  it('contains 3 progressive levels with valid geometries', () => {
    expect(LANTERNA_PUZZLE_LEVELS.length).toBe(3);
    for (const level of LANTERNA_PUZZLE_LEVELS) {
      expect(level.emitter.relPosition.x).toBeGreaterThanOrEqual(0);
      expect(level.emitter.relPosition.x).toBeLessThanOrEqual(1);
      expect(level.targetLens.relPosition.y).toBeGreaterThanOrEqual(0);
      expect(level.targetLens.relPosition.y).toBeLessThanOrEqual(1);
      expect(level.mirrors.length).toBeGreaterThanOrEqual(1);
      expect(level.stars.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns level by id or fallback to level 1', () => {
    expect(getLevelById(1).id).toBe(1);
    expect(getLevelById(2).id).toBe(2);
    expect(getLevelById(3).id).toBe(3);
    expect(getLevelById(99).id).toBe(1);
  });
});
