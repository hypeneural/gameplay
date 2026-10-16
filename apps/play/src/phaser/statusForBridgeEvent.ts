import type { GameBridgeEvent } from '@christmas-games/platform';

export type HostBridgeStatus = 'loading' | 'ready' | 'error';

/**
 * Diagnostics, analytics and exit events must never make the loading overlay
 * disappear. Keep the event-to-status policy exhaustive when new bridge event
 * types are added, without exposing Phaser state to React.
 */
export function statusForBridgeEvent(type: GameBridgeEvent['type']): HostBridgeStatus | undefined {
  switch (type) {
    case 'GAME_OPENED':
      return 'loading';
    case 'GAME_ASSET_FAILED':
      return 'error';
    case 'GAME_READY':
    case 'GAME_STARTED':
    case 'GAME_PAUSED':
    case 'GAME_RESUMED':
    case 'GAME_COMPLETED':
    case 'GAME_INTERACTION_SETTLED':
      return 'ready';
    case 'GAME_SOUND_CHANGED':
    case 'GAME_ASSET_RETRY':
    case 'GAME_MILESTONE':
    case 'GAME_EXITED':
      return undefined;
    default: {
      const unreachable: never = type;
      return unreachable;
    }
  }
}
