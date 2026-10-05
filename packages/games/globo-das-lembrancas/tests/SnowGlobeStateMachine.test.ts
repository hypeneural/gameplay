import { describe, expect, it } from 'vitest';
import { SnowGlobeStateMachine } from '../src/domain/SnowGlobeStateMachine.js';

describe('SnowGlobeStateMachine', () => {
  it('initializes in PRELOAD state and transitions to INTRO on ready()', () => {
    const sm = new SnowGlobeStateMachine();
    expect(sm.state).toBe('PRELOAD');

    sm.ready();
    expect(sm.state).toBe('INTRO');

    const events = sm.drainEvents();
    expect(events.some((e) => e.type === 'STATE_ENTERED' && e.state === 'INTRO')).toBe(true);
  });

  it('automatically advances from INTRO to DORMANT after timer expires (1200ms)', () => {
    const sm = new SnowGlobeStateMachine();
    sm.ready();

    sm.update(500);
    expect(sm.state).toBe('INTRO');

    sm.update(700);
    expect(sm.state).toBe('DORMANT');
  });

  it('progresses through WINDING when turning or tapping the key, reaching STEAM_DISCOVERY', () => {
    const sm = new SnowGlobeStateMachine();
    sm.ready();
    sm.update(1200); // reaches DORMANT

    // Rotate key
    sm.rotateKey(0);
    sm.rotateKey(Math.PI / 2);
    expect(sm.state).toBe('WINDING');

    // Use tapKey to complete winding
    while (sm.state === 'WINDING') {
      sm.tapKey();
    }

    expect(sm.state).toBe('STEAM_DISCOVERY');
    expect(sm.winding.isFullyWound).toBe(true);

    // After STEAM_DISCOVERY timer (1000ms), moves to CLEARING
    sm.update(1000);
    expect(sm.state).toBe('CLEARING');
  });

  it('wipes steam until threshold is reached, transitioning to GEMS_AWAKENING then ILLUMINATING', () => {
    const sm = new SnowGlobeStateMachine();
    sm.ready();
    sm.update(1200);

    // Fast-track winding to CLEARING
    while (!sm.winding.isFullyWound) {
      sm.tapKey();
    }
    sm.update(1000); // STEAM_DISCOVERY -> CLEARING
    expect(sm.state).toBe('CLEARING');

    // Wipe across multiple stripes to clear steam
    sm.wipeSteam({ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.2 }, 0.2);
    sm.wipeSteam({ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }, 0.2);
    sm.wipeSteam({ x: 0.1, y: 0.8 }, { x: 0.9, y: 0.8 }, 0.2);

    expect(sm.steam.isCleared).toBe(true);
    expect(sm.state).toBe('GEMS_AWAKENING');

    // GEMS_AWAKENING timer (900ms) -> ILLUMINATING
    sm.update(900);
    expect(sm.state).toBe('ILLUMINATING');
  });

  it('lights all 4 gems to trigger CELEBRATING, PHOTO_HERO, and FREE_PLAY', () => {
    const sm = new SnowGlobeStateMachine();
    sm.ready();
    sm.update(1200);

    while (!sm.winding.isFullyWound) {
      sm.tapKey();
    }
    sm.update(1000);

    sm.wipeSteam({ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.2 }, 0.2);
    sm.wipeSteam({ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }, 0.2);
    sm.wipeSteam({ x: 0.1, y: 0.8 }, { x: 0.9, y: 0.8 }, 0.2);
    sm.update(900); // to ILLUMINATING

    expect(sm.state).toBe('ILLUMINATING');

    // Tap the 4 gems
    sm.tapGem(0);
    sm.tapGem(1);
    sm.tapGem(2);
    sm.tapGem(3);

    expect(sm.gems.isComplete).toBe(true);
    expect(sm.state).toBe('MUSIC_BOX_STARTING');

    // Check celebration event was queued
    const events = sm.drainEvents();
    expect(events.some((e) => e.type === 'CELEBRATION_TRIGGERED')).toBe(true);

    // MUSIC_BOX_STARTING (1000ms) -> CELEBRATING (1800ms) -> PHOTO_HERO (3000ms) -> FREE_PLAY
    sm.update(1000);
    expect(sm.state).toBe('CELEBRATING');

    sm.update(1800);
    expect(sm.state).toBe('PHOTO_HERO');

    sm.update(3000);
    expect(sm.state).toBe('FREE_PLAY');

    // In FREE_PLAY, player can still wipe steam, swirl snow or finish
    sm.finish();
    expect(sm.state).toBe('COMPLETE');
  });

  it('allows kid-first non-blocking play where buttons are tapped before winding', () => {
    const sm = new SnowGlobeStateMachine();
    sm.ready();
    sm.update(1200); // DORMANT

    // Child taps all 4 buttons first!
    expect(sm.tapGem(0)).toBeDefined();
    expect(sm.tapGem(1)).toBeDefined();
    expect(sm.tapGem(2)).toBeDefined();
    expect(sm.tapGem(3)).toBeDefined();
    expect(sm.gems.isComplete).toBe(true);
    // Not celebrating yet because key is not wound
    expect(sm.state).not.toBe('MUSIC_BOX_STARTING');
    expect(sm.state).not.toBe('CELEBRATING');

    // Child now taps key to complete winding
    while (!sm.winding.isFullyWound) {
      sm.tapKey();
    }

    // Both conditions met -> music box starts immediately!
    expect(sm.state).toBe('MUSIC_BOX_STARTING');
    const events = sm.drainEvents();
    expect(events.some((e) => e.type === 'CELEBRATION_TRIGGERED')).toBe(true);

    sm.update(1000);
    expect(sm.state).toBe('CELEBRATING');
  });
});
