import { useEffect, useRef, useState } from 'react';
import {
  ActiveGameClock,
  GameRunController,
  PageVisibilityController,
  SeededRandom,
} from '@christmas-games/platform';
import type { GameBridge, GameContextSeed, GameController } from '@christmas-games/platform';
import { PhaserMountCoordinator } from './PhaserMountCoordinator.js';
import { loadGameRuntime, mountLoadedGame } from './createGame.js';
import { createRunIdentity } from './createRunIdentity.js';
import type { AvailableGameId } from './gameRegistry.js';

export type PhaserHostStatus = 'loading' | 'ready' | 'error';

interface PhaserHostProps {
  bridge: GameBridge;
  context: GameContextSeed;
  /** A changing value requests a safe exit even while runtime loading is pending. */
  exitRequest: number;
  gameId: AvailableGameId;
  onExit(): void;
  onStateChange(status: PhaserHostStatus, lastEvent: string): void;
}

/** One coordinator is intentionally shared across route transitions. */
const mountCoordinator = new PhaserMountCoordinator();

export function PhaserHost({
  bridge,
  context,
  exitRequest,
  gameId,
  onExit,
  onStateChange,
}: PhaserHostProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const destroyRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const activeRunIdRef = useRef<string | undefined>(undefined);
  const onExitRef = useRef(onExit);
  const onStateChangeRef = useRef(onStateChange);
  const exitPromiseRef = useRef<Promise<void> | undefined>(undefined);
  // A new host must ignore a completed request from its predecessor and react
  // only to a later navigation request.
  const handledExitRequestRef = useRef(exitRequest);
  const [status, setStatus] = useState<PhaserHostStatus>('loading');
  const [lastEvent, setLastEvent] = useState('NONE');

  useEffect(() => {
    onExitRef.current = onExit;
    onStateChangeRef.current = onStateChange;
  }, [onExit, onStateChange]);

  useEffect(() => {
    onStateChangeRef.current(status, lastEvent);
  }, [lastEvent, status]);

  useEffect(
    () =>
      bridge.subscribe((event) => {
        if (event.runId !== activeRunIdRef.current) return;
        setLastEvent(event.type);
        if (event.type === 'GAME_READY') setStatus('ready');
        if (event.type === 'GAME_ASSET_FAILED') setStatus('error');
      }),
    [bridge],
  );

  useEffect(() => {
    let cancelled = false;
    let controllerDestroy: (() => Promise<void>) | undefined;
    let creatingController: Promise<GameController> | undefined;
    let destroyPromise: Promise<void> | undefined;
    let detachVisibility: (() => void) | undefined;
    let releaseLease: (() => void) | undefined;
    let runId: string | undefined;

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
          if (activeRunIdRef.current === runId) activeRunIdRef.current = undefined;
          if (destroyRef.current === requestDestroy) destroyRef.current = undefined;
        }
      })();
      return destroyPromise;
    };

    const requestDestroy = async (): Promise<void> => {
      cancelled = true;
      await destroy();
    };
    // Expose cancellation before imports start so Back can safely leave a
    // loading game without waiting for the network or module parser.
    destroyRef.current = requestDestroy;

    const mount = async (): Promise<void> => {
      let runtime;
      try {
        runtime = await loadGameRuntime(gameId);
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to load the Phaser game runtime.', error);
          setStatus('error');
        }
        return;
      }
      if (cancelled) return;

      releaseLease = await mountCoordinator.acquire();
      if (cancelled || !hostRef.current) {
        releaseLease();
        releaseLease = undefined;
        return;
      }

      const identity = createRunIdentity();
      runId = identity.runId;
      activeRunIdRef.current = runId;
      setStatus('loading');
      setLastEvent('NONE');

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
        if (cancelled) await destroy();
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to start the Phaser game.', error);
          setStatus('error');
        }
        await destroy().catch((destroyError: unknown) => {
          console.error('Unable to destroy a failed Phaser mount.', destroyError);
        });
      }
    };

    void mount();
    return () => {
      cancelled = true;
      void destroy().catch((error: unknown) => console.error('Unable to destroy Phaser.', error));
    };
  }, [bridge, context, gameId]);

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
      data-quality={context.quality}
      data-reduced-motion={window.matchMedia('(prefers-reduced-motion: reduce)').matches}
      data-testid="phaser-host"
      ref={hostRef}
    />
  );
}
