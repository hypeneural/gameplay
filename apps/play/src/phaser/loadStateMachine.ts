import type { GameBridgeEvent } from '@christmas-games/platform';
import { statusForBridgeEvent, type HostBridgeStatus } from './statusForBridgeEvent.js';

export type PhaserHostStatus = HostBridgeStatus;

export type PhaserLoadPhase =
  'importing' | 'waiting_mount' | 'loading_assets' | 'preparing_scene' | 'ready' | 'error';

export interface PhaserLoadDiagnostics {
  phase: PhaserLoadPhase;
  progress?: number | undefined;
  retryAttempt?: number | undefined;
  importMs?: number | undefined;
  mountWaitMs?: number | undefined;
}

export interface LoadTrackerState {
  status: PhaserHostStatus;
  exited: boolean;
  diagnostics: PhaserLoadDiagnostics;
}

export interface LoadTransition {
  state: LoadTrackerState;
  /** True when React must receive a new status/diagnostics snapshot. */
  publish: boolean;
  /** Present only for GAME_SOUND_CHANGED. */
  soundEnabled?: boolean;
}

export function initialLoadState(): LoadTrackerState {
  return { status: 'loading', exited: false, diagnostics: { phase: 'importing' } };
}

/**
 * Host-side phases that happen before the run exists (import, mount lease).
 * They never regress a run that already reached assets, readiness or error.
 */
export function applyHostPhase(
  state: LoadTrackerState,
  patch: Partial<PhaserLoadDiagnostics> & {
    phase: 'importing' | 'waiting_mount' | 'loading_assets';
  },
): LoadTransition {
  if (state.exited || state.status !== 'loading') return { state, publish: false };
  return {
    state: { ...state, diagnostics: { ...state.diagnostics, ...patch } },
    publish: true,
  };
}

export function applyHostError(state: LoadTrackerState): LoadTransition {
  if (state.exited) return { state, publish: false };
  return {
    state: { ...state, status: 'error', diagnostics: { ...state.diagnostics, phase: 'error' } },
    publish: true,
  };
}

const unchanged = (state: LoadTrackerState): LoadTransition => ({ state, publish: false });

/**
 * Exhaustive bridge-event reducer. Only GAME_READY (or lifecycle events the run
 * controller can emit exclusively after GAME_READY) may end loading; progress,
 * retries, milestones and GAME_OPENED keep the loading screen and never regress
 * progress. Every event after exit is ignored.
 */
export function reduceLoadEvent(state: LoadTrackerState, event: GameBridgeEvent): LoadTransition {
  if (state.exited) return unchanged(state);

  switch (event.type) {
    case 'GAME_SOUND_CHANGED':
      return { state, publish: false, soundEnabled: event.enabled };

    case 'GAME_EXITED':
      return { state: { ...state, exited: true }, publish: false };

    case 'GAME_MILESTONE':
      return unchanged(state);

    case 'GAME_OPENED': {
      if (state.status !== 'loading') return unchanged(state);
      const phase: PhaserLoadPhase =
        state.diagnostics.phase === 'preparing_scene' ? 'preparing_scene' : 'loading_assets';
      return { state: { ...state, diagnostics: { ...state.diagnostics, phase } }, publish: true };
    }

    case 'GAME_LOAD_PROGRESS': {
      if (state.status !== 'loading') return unchanged(state);
      const phase: PhaserLoadPhase =
        state.diagnostics.phase === 'preparing_scene' || event.stage === 'preparing_scene'
          ? 'preparing_scene'
          : 'loading_assets';
      const progress = Math.min(
        1,
        Math.max(
          state.diagnostics.progress ?? 0,
          Number.isFinite(event.progress) ? event.progress : 0,
        ),
      );
      return {
        state: { ...state, diagnostics: { ...state.diagnostics, phase, progress } },
        publish: true,
      };
    }

    case 'GAME_ASSET_RETRY': {
      if (state.status !== 'loading') return unchanged(state);
      const phase: PhaserLoadPhase =
        state.diagnostics.phase === 'preparing_scene' ? 'preparing_scene' : 'loading_assets';
      return {
        state: {
          ...state,
          diagnostics: { ...state.diagnostics, phase, retryAttempt: event.attempt },
        },
        publish: true,
      };
    }

    case 'GAME_ASSET_FAILED':
    case 'GAME_READY':
    case 'GAME_STARTED':
    case 'GAME_INTERACTION_SETTLED':
    case 'GAME_PAUSED':
    case 'GAME_RESUMED':
    case 'GAME_COMPLETED': {
      const targetStatus = statusForBridgeEvent(event.type);
      if (targetStatus === 'error') {
        return {
          state: {
            ...state,
            status: 'error',
            diagnostics: { ...state.diagnostics, phase: 'error' },
          },
          publish: true,
        };
      }
      if (targetStatus !== 'ready' || state.status === 'error') return unchanged(state);
      return {
        state: {
          ...state,
          status: 'ready',
          diagnostics: { ...state.diagnostics, phase: 'ready', progress: 1 },
        },
        publish: true,
      };
    }

    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
