import { describe, expect, it } from 'vitest';
import { createFixtureSession } from '@christmas-games/platform';
import {
  applyHostError,
  applyHostPhase,
  initialLoadState,
  reduceLoadEvent,
} from './loadStateMachine.js';
import { resolveLoadingPhaseMessage } from '../components/ChristmasLoadingExperience.js';
import { prefetchGamePhoto } from './createGame.js';

const baseIdentity = {
  gameId: 'puzzle-swap',
  runId: 'run-1',
};

describe('loadStateMachine', () => {
  it('keeps status as loading on GAME_ASSET_RETRY and records the retry attempt', () => {
    let state = initialLoadState();
    state = applyHostPhase(state, { phase: 'loading_assets', importMs: 42 }).state;

    const retryTransition = reduceLoadEvent(state, {
      ...baseIdentity,
      sequence: 1,
      type: 'GAME_ASSET_RETRY',
      attempt: 1,
    });

    expect(retryTransition.publish).toBe(true);
    expect(retryTransition.state.status).toBe('loading');
    expect(retryTransition.state.diagnostics.phase).toBe('loading_assets');
    expect(retryTransition.state.diagnostics.retryAttempt).toBe(1);
  });

  it('transitions to ready only when GAME_READY (or post-ready lifecycle event) arrives and ignores GAME_MILESTONE', () => {
    let state = initialLoadState();
    state = reduceLoadEvent(state, {
      ...baseIdentity,
      sequence: 1,
      type: 'GAME_OPENED',
    }).state;
    expect(state.status).toBe('loading');

    const milestoneTransition = reduceLoadEvent(state, {
      ...baseIdentity,
      sequence: 2,
      type: 'GAME_MILESTONE',
      name: 'scene_boot',
      elapsedMs: 120,
    });
    expect(milestoneTransition.publish).toBe(false);
    expect(milestoneTransition.state.status).toBe('loading');

    const readyTransition = reduceLoadEvent(milestoneTransition.state, {
      ...baseIdentity,
      sequence: 3,
      type: 'GAME_READY',
    });
    expect(readyTransition.publish).toBe(true);
    expect(readyTransition.state.status).toBe('ready');
    expect(readyTransition.state.diagnostics.phase).toBe('ready');
    expect(readyTransition.state.diagnostics.progress).toBe(1);
  });

  it('accepts progress before GAME_OPENED and never resets progress or regresses phase when GAME_OPENED arrives later', () => {
    let state = initialLoadState();
    state = applyHostPhase(state, { phase: 'loading_assets' }).state;

    // Globo, Estilingue, and Lanterna emit loader progress in preload() before open() in create()
    state = reduceLoadEvent(state, {
      ...baseIdentity,
      sequence: 1,
      type: 'GAME_LOAD_PROGRESS',
      progress: 0.65,
      stage: 'loading_assets',
    }).state;
    expect(state.status).toBe('loading');
    expect(state.diagnostics.progress).toBe(0.65);
    expect(state.diagnostics.phase).toBe('loading_assets');

    state = reduceLoadEvent(state, {
      ...baseIdentity,
      sequence: 2,
      type: 'GAME_LOAD_PROGRESS',
      progress: 0.96,
      stage: 'preparing_scene',
    }).state;
    expect(state.diagnostics.progress).toBe(0.96);
    expect(state.diagnostics.phase).toBe('preparing_scene');

    // Now create() calls run.open() -> GAME_OPENED arrives after progress
    const openedTransition = reduceLoadEvent(state, {
      ...baseIdentity,
      sequence: 3,
      type: 'GAME_OPENED',
    });
    expect(openedTransition.publish).toBe(true);
    expect(openedTransition.state.status).toBe('loading');
    expect(openedTransition.state.diagnostics.progress).toBe(0.96);
    expect(openedTransition.state.diagnostics.phase).toBe('preparing_scene');
  });

  it('ignores late events after GAME_READY, GAME_ASSET_FAILED, or GAME_EXITED', () => {
    let readyState = initialLoadState();
    readyState = reduceLoadEvent(readyState, {
      ...baseIdentity,
      sequence: 1,
      type: 'GAME_READY',
    }).state;

    const lateOpened = reduceLoadEvent(readyState, {
      ...baseIdentity,
      sequence: 2,
      type: 'GAME_OPENED',
    });
    expect(lateOpened.publish).toBe(false);
    expect(lateOpened.state.status).toBe('ready');

    const lateProgress = reduceLoadEvent(readyState, {
      ...baseIdentity,
      sequence: 3,
      type: 'GAME_LOAD_PROGRESS',
      progress: 0.5,
      stage: 'loading_assets',
    });
    expect(lateProgress.publish).toBe(false);
    expect(lateProgress.state.status).toBe('ready');

    const lateRetry = reduceLoadEvent(readyState, {
      ...baseIdentity,
      sequence: 4,
      type: 'GAME_ASSET_RETRY',
      attempt: 2,
    });
    expect(lateRetry.publish).toBe(false);
    expect(lateRetry.state.status).toBe('ready');

    // Error state ignores late GAME_READY
    let errorState = initialLoadState();
    errorState = reduceLoadEvent(errorState, {
      ...baseIdentity,
      sequence: 1,
      type: 'GAME_ASSET_FAILED',
      reason: 'photo-load-failed',
    }).state;
    expect(errorState.status).toBe('error');

    const readyAfterError = reduceLoadEvent(errorState, {
      ...baseIdentity,
      sequence: 2,
      type: 'GAME_READY',
    });
    expect(readyAfterError.publish).toBe(false);
    expect(readyAfterError.state.status).toBe('error');

    // Exited state ignores all subsequent events and host phases
    let exitedState = initialLoadState();
    exitedState = reduceLoadEvent(exitedState, {
      ...baseIdentity,
      sequence: 1,
      type: 'GAME_EXITED',
    }).state;
    expect(exitedState.exited).toBe(true);
    expect(
      reduceLoadEvent(exitedState, {
        ...baseIdentity,
        sequence: 2,
        type: 'GAME_READY',
      }).publish,
    ).toBe(false);
    expect(applyHostPhase(exitedState, { phase: 'waiting_mount' }).publish).toBe(false);
    expect(applyHostError(exitedState).publish).toBe(false);
  });

  it('resolves truthful phase and game-specific messages in ChristmasLoadingExperience', () => {
    expect(resolveLoadingPhaseMessage('session', 'importing', undefined, undefined)).toContain(
      'fotografias autorizadas',
    );
    expect(resolveLoadingPhaseMessage('game', 'importing', 'puzzle-swap', undefined)).toContain(
      'oficina de Natal',
    );
    expect(
      resolveLoadingPhaseMessage('game', 'loading_assets', 'puzzle-swap', undefined),
    ).toContain('peças douradas');
    expect(
      resolveLoadingPhaseMessage('game', 'preparing_scene', 'puzzle-swap', undefined),
    ).toContain('Acendendo as luzes');
    expect(resolveLoadingPhaseMessage('game', 'loading_assets', 'puzzle-swap', 2)).toContain(
      'tentativa 2',
    );
  });

  it('does not prefetch when game and card share the same fixture URL or when lowQuality is enabled', () => {
    const fixturePhoto = createFixtureSession(4).photos[0]!;
    expect(() => prefetchGamePhoto(fixturePhoto, false)).not.toThrow();
    expect(() => prefetchGamePhoto(fixturePhoto, true)).not.toThrow();
  });
});
