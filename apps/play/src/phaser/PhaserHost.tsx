import { useCallback, useEffect, useRef } from 'react';
import {
  ActiveGameClock,
  GameRunController,
  PageVisibilityController,
  SeededRandom,
} from '@christmas-games/platform';
import type {
  GameBridge,
  GameBridgeEvent,
  GameContextSeed,
  GameController,
} from '@christmas-games/platform';
import { PhaserMountCoordinator } from './PhaserMountCoordinator.js';
import { loadGameRuntime, mountLoadedGame } from './createGame.js';
import { createRunIdentity } from './createRunIdentity.js';
import type { AvailableGameId } from './gameRegistry.js';
import {
  applyHostError,
  applyHostPhase,
  initialLoadState,
  reduceLoadEvent,
  type LoadTrackerState,
  type PhaserHostStatus,
  type PhaserLoadDiagnostics,
  type PhaserLoadPhase,
} from './loadStateMachine.js';

export type { PhaserHostStatus, PhaserLoadDiagnostics, PhaserLoadPhase };

interface PhaserHostProps {
  bridge: GameBridge;
  context: GameContextSeed;
  /** A changing value requests a safe exit even while runtime loading is pending. */
  exitRequest: number;
  gameId: AvailableGameId;
  onExit(): void;
  onSoundChange?(enabled: boolean): void;
  onStateChange(
    status: PhaserHostStatus,
    lastEvent: string,
    sequence: number,
    diagnostics?: PhaserLoadDiagnostics,
  ): void;
  /** Development labs can inject a seed to replay the same board exactly. */
  runSeed?: number;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/** One coordinator is intentionally shared across route transitions. */
const mountCoordinator = new PhaserMountCoordinator();

export function PhaserHost({
  bridge,
  context,
  exitRequest,
  gameId,
  onExit,
  onSoundChange,
  onStateChange,
  runSeed,
}: PhaserHostProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const destroyRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const activeRunIdRef = useRef<string | undefined>(undefined);
  const runTrackerRef = useRef<LoadTrackerState>(initialLoadState());
  const onExitRef = useRef(onExit);
  const onSoundChangeRef = useRef(onSoundChange);
  const onStateChangeRef = useRef(onStateChange);
  const exitPromiseRef = useRef<Promise<void> | undefined>(undefined);
  // A new host must ignore a completed request from its predecessor and react
  // only to a later navigation request.
  const handledExitRequestRef = useRef(exitRequest);
  useEffect(() => {
    onExitRef.current = onExit;
    onSoundChangeRef.current = onSoundChange;
    onStateChangeRef.current = onStateChange;
  }, [onExit, onStateChange, onSoundChange]);

  const publishHostPhase = useCallback(
    (
      patch: Partial<PhaserLoadDiagnostics> & {
        phase: 'importing' | 'waiting_mount' | 'loading_assets';
      },
    ): void => {
      const transition = applyHostPhase(runTrackerRef.current, patch);
      runTrackerRef.current = transition.state;
      if (transition.publish) {
        onStateChangeRef.current(transition.state.status, 'NONE', 0, transition.state.diagnostics);
      }
    },
    [],
  );

  const publishBridgeEvent = useCallback((event: GameBridgeEvent): void => {
    const transition = reduceLoadEvent(runTrackerRef.current, event);
    runTrackerRef.current = transition.state;
    if (transition.soundEnabled !== undefined) {
      onSoundChangeRef.current?.(transition.soundEnabled);
      return;
    }
    if (transition.publish) {
      onStateChangeRef.current(
        transition.state.status,
        event.type,
        event.sequence,
        transition.state.diagnostics,
      );
    }
  }, []);

  const publishError = useCallback((): void => {
    const transition = applyHostError(runTrackerRef.current);
    runTrackerRef.current = transition.state;
    if (transition.publish) {
      onStateChangeRef.current(transition.state.status, 'NONE', 0, transition.state.diagnostics);
    }
  }, []);

  useEffect(() => {
    const receiveBridgeEvent = (event: GameBridgeEvent): void => {
      if (event.runId !== activeRunIdRef.current) return;
      publishBridgeEvent(event);
    };
    const unsubscribe = bridge.subscribe(receiveBridgeEvent);
    return () => unsubscribe();
  }, [bridge, publishBridgeEvent]);

  useEffect(() => {
    let cancelled = false;
    let controllerDestroy: (() => Promise<void>) | undefined;
    let creatingController: Promise<GameController> | undefined;
    let destroyPromise: Promise<void> | undefined;
    let detachVisibility: (() => void) | undefined;
    let releaseLease: (() => void) | undefined;
    let runId: string | undefined;

    runTrackerRef.current = initialLoadState();

    /**
     * A create call can be asynchronous. Once a lease is acquired it remains
     * held until a controller created in flight has completed destruction.
     */
    const destroy = (): Promise<void> => {
      if (destroyPromise) return destroyPromise;
      destroyPromise = (async () => {
        const destroyController = controllerDestroy;
        controllerDestroy = undefined;
        try {
          if (destroyController) {
            await destroyController();
          } else if (creatingController) {
            const controller = await creatingController;
            await controller.destroy();
          }
        } finally {
          controllerDestroy = undefined;
          detachVisibility?.();
          detachVisibility = undefined;
          releaseLease?.();
          releaseLease = undefined;
          if (runId && activeRunIdRef.current === runId) {
            activeRunIdRef.current = undefined;
            bridge.release(runId);
          }
          if (destroyRef.current === requestDestroy) destroyRef.current = undefined;
        }
      })();
      return destroyPromise;
    };

    const requestDestroy = async (): Promise<void> => {
      cancelled = true;
      runTrackerRef.current.exited = true;
      await destroy();
    };
    // Expose cancellation before imports start so Back can safely leave a
    // loading game without waiting for the network or module parser.
    destroyRef.current = requestDestroy;

    const mount = async (): Promise<void> => {
      publishHostPhase({ phase: 'importing' });

      let runtime;
      try {
        runtime = await loadGameRuntime(gameId);
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to load the Phaser game runtime.', error);
          publishError();
        }
        return;
      }
      if (cancelled) return;

      const mountWaitStart = nowMs();
      publishHostPhase({
        phase: 'waiting_mount',
        importMs: runtime.importMs,
      });

      releaseLease = await mountCoordinator.acquire();
      if (cancelled || !hostRef.current) {
        releaseLease();
        releaseLease = undefined;
        return;
      }

      const mountWaitMs = Math.max(0, Math.round(nowMs() - mountWaitStart));
      const identity = createRunIdentity(runSeed);
      runId = identity.runId;
      activeRunIdRef.current = runId;
      publishHostPhase({
        phase: 'loading_assets',
        importMs: runtime.importMs,
        mountWaitMs,
      });

      const activeClock = new ActiveGameClock(context.clock);
      const runtimeContext = {
        ...context,
        clock: activeClock,
        random: new SeededRandom(identity.runSeed),
        runSeed: identity.runSeed,
        run: new GameRunController(gameId, identity.runId, activeClock, context.analytics, bridge),
      };
      detachVisibility = new PageVisibilityController(document, runtimeContext.run).attach();

      try {
        creatingController = mountLoadedGame(runtime, hostRef.current, runtimeContext, bridge);
        const controller = await creatingController;
        creatingController = undefined;
        controllerDestroy = controller.destroy;
        // Phaser can finish its synchronous Scene setup before a React effect
        // observes the first bridge event. Reapply the bounded latest event
        // for this exact run; no Scene or game state crosses this boundary.
        const latestEvent = bridge.latest(identity.runId);
        if (latestEvent?.runId === activeRunIdRef.current) {
          publishBridgeEvent(latestEvent);
        }
        if (cancelled) await destroy();
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to start the Phaser game.', error);
          publishError();
        }
        await destroy().catch((destroyError: unknown) => {
          console.error('Unable to destroy a failed Phaser mount.', destroyError);
        });
      }
    };

    void mount();
    return () => {
      cancelled = true;
      runTrackerRef.current.exited = true;
      void destroy().catch((error: unknown) => console.error('Unable to destroy Phaser.', error));
    };
  }, [bridge, context, gameId, publishBridgeEvent, publishError, publishHostPhase, runSeed]);

  const exit = (): Promise<void> => {
    if (exitPromiseRef.current) return exitPromiseRef.current;
    exitPromiseRef.current = (async () => {
      await destroyRef.current?.();
      onExitRef.current();
    })();
    return exitPromiseRef.current;
  };

  useEffect(() => {
    if (exitRequest === 0 || exitRequest === handledExitRequestRef.current) return;
    handledExitRequestRef.current = exitRequest;
    void exit();
  }, [exitRequest]);

  return (
    <div
      className="phaser-host"
      data-difficulty={context.difficulty ?? 'normal'}
      data-quality={context.quality}
      data-reduced-motion={
        context.preferences?.reducedMotion ??
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }
      data-testid="phaser-host"
      ref={hostRef}
    />
  );
}
