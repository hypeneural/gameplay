import { describe, expect, it } from 'vitest';
import type { GameBridgeEvent } from '@christmas-games/platform';
import { statusForBridgeEvent } from './statusForBridgeEvent.js';

describe('Phaser bridge loading readiness', () => {
  it('stays in loading on game open', () => {
    expect(statusForBridgeEvent('GAME_OPENED')).toBe('loading');
  });

  it('enters error only on an explicit required-asset failure', () => {
    expect(statusForBridgeEvent('GAME_ASSET_FAILED')).toBe('error');
  });

  const readyEvents = [
    'GAME_READY',
    'GAME_STARTED',
    'GAME_PAUSED',
    'GAME_RESUMED',
    'GAME_COMPLETED',
    'GAME_INTERACTION_SETTLED',
  ] as const satisfies readonly GameBridgeEvent['type'][];

  for (const type of readyEvents) {
    it(`treats ${type} as an actual in-run lifecycle signal`, () => {
      expect(statusForBridgeEvent(type)).toBe('ready');
    });
  }

  const nonReadinessEvents = [
    'GAME_LOAD_PROGRESS',
    'GAME_SOUND_CHANGED',
    'GAME_ASSET_RETRY',
    'GAME_MILESTONE',
    'GAME_EXITED',
  ] as const satisfies readonly GameBridgeEvent['type'][];

  for (const type of nonReadinessEvents) {
    it(`never considers ${type} a readiness signal`, () => {
      expect(statusForBridgeEvent(type)).toBeUndefined();
    });
  }
});
