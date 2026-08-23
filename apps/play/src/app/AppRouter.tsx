import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFixtureSession } from '@christmas-games/platform';
import type { GameContextSeed } from '@christmas-games/platform';
import { PhaserHost } from '../phaser/PhaserHost.js';
import type { PhaserHostStatus } from '../phaser/PhaserHost.js';
import { prefetchGame } from '../phaser/createGame.js';
import { getInstalledGame, gameDefinitions } from '../phaser/gameRegistry.js';
import { ExperienceLab } from '../screens/ExperienceLab.js';
import { GameCover } from '../screens/GameCover.js';
import { GameScreen } from '../screens/GameScreen.js';
import { Hub } from '../screens/Hub.js';
import { ThemeLab } from '../screens/ThemeLab.js';
import { createAppServices } from './AppServices.js';
import { parseAppRoute, routePath } from './AppNavigation.js';
import type { AppRoute, GameCoverRoute, SessionRoute } from './AppNavigation.js';

type FixtureCount = 4 | 12 | 120 | 172;
type HistoryMode = 'none' | 'push' | 'replace';

interface PendingNavigation {
  mode: HistoryMode;
  route: AppRoute;
}

interface HistoryState {
  christmasGamesIndex?: number;
}

interface GameView {
  lastEvent: string;
  status: PhaserHostStatus;
}

const initialGameView: GameView = { lastEvent: 'NONE', status: 'loading' };

export function AppRouter(): React.JSX.Element {
  const initialRoute = useMemo(() => parseAppRoute(window.location.pathname), []);
  const services = useMemo(createAppServices, []);
  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const [fixtureCount, setFixtureCount] = useState<FixtureCount>(12);
  const [selectedPhotoId, setSelectedPhotoId] = useState('ph_001');
  const [playing, setPlaying] = useState(false);
  const [gameAttempt, setGameAttempt] = useState(0);
  const [gameView, setGameView] = useState(initialGameView);
  const navigationIndexRef = useRef(readHistoryIndex());
  const playingRef = useRef(false);
  const pendingNavigationRef = useRef<PendingNavigation | undefined>(undefined);
  const [exitRequest, setExitRequest] = useState(0);

  const session = useMemo(() => createFixtureSession(fixtureCount), [fixtureCount]);
  const selectedPhoto =
    session.photos.find((photo) => photo.id === selectedPhotoId) ?? session.photos[0]!;
  const context = useMemo<GameContextSeed>(
    () => ({
      session,
      selectedPhoto,
      clock: { now: () => performance.now() },
      analytics: services.analytics,
      haptics: services.haptics,
      quality: 'NORMAL',
    }),
    [selectedPhoto, services, session],
  );

  const writeRoute = useCallback(
    (nextRoute: SessionRoute | GameCoverRoute, mode: Exclude<HistoryMode, 'none'>) => {
      const nextIndex =
        mode === 'push' ? navigationIndexRef.current + 1 : navigationIndexRef.current;
      const state: HistoryState = { christmasGamesIndex: nextIndex };
      window.history[mode === 'push' ? 'pushState' : 'replaceState'](
        state,
        '',
        routePath(nextRoute),
      );
      navigationIndexRef.current = nextIndex;
      setRoute(nextRoute);
    },
    [],
  );

  useEffect(() => {
    if (initialRoute.kind === 'theme-lab' || initialRoute.kind === 'experience-lab') return;
    const state = window.history.state as HistoryState | null;
    if (typeof state?.christmasGamesIndex !== 'number') {
      window.history.replaceState(
        { christmasGamesIndex: navigationIndexRef.current },
        '',
        routePath(initialRoute),
      );
    }
  }, [initialRoute]);

  const requestGameExit = useCallback((nextRoute: AppRoute, mode: HistoryMode): void => {
    pendingNavigationRef.current = { mode, route: nextRoute };
    setExitRequest((request) => request + 1);
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent): void => {
      const nextRoute = parseAppRoute(window.location.pathname);
      const nextState = event.state as HistoryState | null;
      navigationIndexRef.current = nextState?.christmasGamesIndex ?? 0;
      if (playingRef.current) {
        requestGameExit(nextRoute, 'none');
        return;
      }
      setRoute(nextRoute);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [requestGameExit]);

  const prefetch = (gameId: string): void => {
    if (!getInstalledGame(gameId)) return;
    prefetchGame(gameId as Parameters<typeof prefetchGame>[0]);
  };

  const openGame = (gameId: string): void => {
    if (!getInstalledGame(gameId) || (route.kind !== 'session' && route.kind !== 'game-cover'))
      return;
    writeRoute({ kind: 'game-cover', token: route.token, gameId }, 'push');
  };

  const goToSession = (token: string): void => {
    const sessionRoute: SessionRoute = { kind: 'session', token };
    if (playingRef.current) {
      if (navigationIndexRef.current > 0) {
        window.history.back();
      } else {
        requestGameExit(sessionRoute, 'replace');
      }
      return;
    }
    if (navigationIndexRef.current > 0) {
      window.history.back();
    } else {
      writeRoute(sessionRoute, 'replace');
    }
  };

  const play = (): void => {
    playingRef.current = true;
    setGameView(initialGameView);
    setPlaying(true);
  };

  const retry = (): void => {
    setGameView(initialGameView);
    setGameAttempt((attempt) => attempt + 1);
  };

  const handleGameExit = (): void => {
    playingRef.current = false;
    setPlaying(false);
    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = undefined;
    if (!pending) return;
    if (
      pending.route.kind !== 'theme-lab' &&
      pending.route.kind !== 'experience-lab' &&
      pending.mode !== 'none'
    ) {
      writeRoute(pending.route, pending.mode);
      return;
    }
    setRoute(pending.route);
  };

  if (route.kind === 'theme-lab') return <ThemeLab />;
  if (route.kind === 'experience-lab') return <ExperienceLab />;

  if (route.kind === 'session') {
    return (
      <Hub
        fixtureCount={fixtureCount}
        games={gameDefinitions}
        onFixtureChange={setFixtureCount}
        onOpenGame={openGame}
        onPrefetchGame={prefetch}
        onSelectPhoto={setSelectedPhotoId}
        selectedPhotoId={selectedPhoto.id}
        session={session}
      />
    );
  }

  const gameRoute = route as GameCoverRoute;
  const game = getInstalledGame(gameRoute.gameId);
  if (!game) {
    return (
      <main className="shell unavailable-game" role="alert">
        <p className="eyebrow">JOGO INDISPONÍVEL</p>
        <h1>Este jogo não está nesta edição.</h1>
        <button className="button" type="button" onClick={() => goToSession(gameRoute.token)}>
          Voltar para a sessão
        </button>
      </main>
    );
  }

  if (!playing) {
    return (
      <GameCover
        definition={game.definition}
        photo={selectedPhoto}
        onBack={() => goToSession(gameRoute.token)}
        onPlay={play}
        onPrefetch={() => prefetch(gameRoute.gameId)}
      />
    );
  }

  return (
    <GameScreen
      definition={game.definition}
      lastEvent={gameView.lastEvent}
      onExit={() => goToSession(gameRoute.token)}
      onRetry={retry}
      status={gameView.status}
    >
      <PhaserHost
        bridge={services.bridge}
        context={context}
        exitRequest={exitRequest}
        gameId={gameRoute.gameId as Parameters<typeof prefetchGame>[0]}
        key={gameAttempt}
        onExit={handleGameExit}
        onStateChange={(status, lastEvent) => {
          setGameView((current) =>
            current.status === status && current.lastEvent === lastEvent
              ? current
              : { status, lastEvent },
          );
        }}
      />
    </GameScreen>
  );
}

function readHistoryIndex(): number {
  const state = window.history.state as HistoryState | null;
  return typeof state?.christmasGamesIndex === 'number' ? state.christmasGamesIndex : 0;
}
