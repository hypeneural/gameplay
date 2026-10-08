import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFixtureSession } from '@christmas-games/platform';
import type { GameContextSeed, GameDifficulty } from '@christmas-games/platform';
import { memoryStandardPairCount } from '@christmas-games/memory/definition';
import { PhaserHost } from '../phaser/PhaserHost.js';
import type { PhaserHostStatus } from '../phaser/PhaserHost.js';
import { prefetchGame } from '../phaser/createGame.js';
import { getInstalledGame, gameDefinitions } from '../phaser/gameRegistry.js';
import { AssetLab } from '../screens/AssetLab.js';
import { ExperienceLab } from '../screens/ExperienceLab.js';
import { GameCover } from '../screens/GameCover.js';
import { GameScreen } from '../screens/GameScreen.js';
import { Hub } from '../screens/Hub.js';
import { ThemeLab } from '../screens/ThemeLab.js';
import { createAppServices } from './AppServices.js';
import { parseAppRoute, routePath } from './AppNavigation.js';
import { resolveGameQuality } from './GameQuality.js';
import { resolveBrowserReleaseMode } from './ReleaseMode.js';
import {
  disposeInterfaceAudio,
  playInterfaceTap,
  setInterfaceSoundEnabled,
  stopInterfaceTap,
} from '../audio/playInterfaceTap.js';
import type { AppRoute, GameCoverRoute, PublicRoute, SessionRoute } from './AppNavigation.js';
import { fetchLocalTestSession, shouldUseLocalTestMedia } from './LocalTestSession.js';
import type { Session } from '@christmas-games/platform';

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
  eventSequence: number;
  lastEvent: string;
  status: PhaserHostStatus;
}

const initialGameView: GameView = { eventSequence: 0, lastEvent: 'NONE', status: 'loading' };
const SessionGallery = lazy(async () => ({
  default: (await import('../screens/SessionGallery.js')).SessionGallery,
}));
const PerformanceLab = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('../screens/PerformanceLab.js')).PerformanceLab }))
  : undefined;

export function AppRouter(): React.JSX.Element {
  const initialRoute = useMemo(() => parseAppRoute(window.location.pathname), []);
  const releaseMode = useMemo(() => resolveBrowserReleaseMode(import.meta.env), []);
  const services = useMemo(createAppServices, []);
  const quality = useMemo(
    () =>
      resolveGameQuality(
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection,
      ),
    [],
  );
  const usesLocalTestMedia = useMemo(
    () => releaseMode === 'development' && shouldUseLocalTestMedia(window.location.search),
    [releaseMode],
  );
  const localTestMediaSearch = usesLocalTestMedia ? '?test-media=local' : '';
  const developmentScenario = useMemo(() => {
    if (!import.meta.env.DEV) return undefined;
    const scenario = new URLSearchParams(window.location.search).get('scenario');
    return scenario === 'victory' || scenario === 'rudolph-review' ? scenario : undefined;
  }, []);
  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const [fixtureCount, setFixtureCount] = useState<FixtureCount>(12);
  const [selectedPhotoId, setSelectedPhotoId] = useState('ph_001');
  const [localSession, setLocalSession] = useState<Session>();
  const [localSessionError, setLocalSessionError] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundPreferenceRef = useRef(true);
  const [calm, setCalm] = useState(false);
  const hubScrollRef = useRef(0);
  const galleryScrollRef = useRef(0);
  const [gameAttempt, setGameAttempt] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [gameView, setGameView] = useState(initialGameView);
  const navigationIndexRef = useRef(readHistoryIndex());
  const playingRef = useRef(false);
  const pendingNavigationRef = useRef<PendingNavigation | undefined>(undefined);
  const [exitRequest, setExitRequest] = useState(0);

  const fixtureSession = useMemo(() => createFixtureSession(fixtureCount), [fixtureCount]);
  const session = usesLocalTestMedia && localSession ? localSession : fixtureSession;
  const selectedPhoto =
    session.photos.find((photo) => photo.id === selectedPhotoId) ?? session.photos[0]!;
  const context = useMemo<GameContextSeed>(
    () => ({
      session,
      selectedPhoto,
      clock: { now: () => performance.now() },
      analytics: services.analytics,
      haptics: services.haptics,
      quality,
      difficulty,
      preferences: {
        reducedMotion: calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        // The next run reads the latest preference. Updating mute during a run
        // must not replace the context object and remount its Phaser canvas.
        get soundEnabled() {
          return soundPreferenceRef.current;
        },
      },
      ...(developmentScenario && gameAttempt === 0
        ? { development: { scenario: developmentScenario } }
        : {}),
    }),
    [calm, developmentScenario, difficulty, gameAttempt, quality, selectedPhoto, services, session],
  );

  const shellControls = {
    soundEnabled,
    calm,
    animationsLocked:
      quality === 'LOW' || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    onToggleSound: (): void => {
      soundPreferenceRef.current = !soundEnabled;
      setInterfaceSoundEnabled(!soundEnabled);
      setSoundEnabled(!soundEnabled);
      if (!soundEnabled) playInterfaceTap('toggle');
    },
    onToggleCalm: (): void => {
      playInterfaceTap(calm ? 'magic' : 'toggle');
      setCalm((value) => !value);
    },
  };

  useEffect(() => {
    setInterfaceSoundEnabled(true);
    const silenceHiddenPage = (): void => {
      if (document.hidden) stopInterfaceTap();
    };
    document.addEventListener('visibilitychange', silenceHiddenPage);
    return () => {
      document.removeEventListener('visibilitychange', silenceHiddenPage);
      disposeInterfaceAudio();
    };
  }, []);

  useEffect(() => {
    if (route.kind === 'session') window.scrollTo(0, hubScrollRef.current);
    else if (route.kind === 'gallery') window.scrollTo(0, galleryScrollRef.current);
    else if (route.kind === 'game-cover' && !playing) window.scrollTo(0, 0);
  }, [route, playing]);

  const currentToken = 'token' in route ? route.token : undefined;
  const previousTokenRef = useRef(currentToken);

  useEffect(() => {
    if (currentToken && previousTokenRef.current && previousTokenRef.current !== currentToken) {
      hubScrollRef.current = 0;
      galleryScrollRef.current = 0;
      setPlaying(false);
      setGameAttempt(0);
      setGameView(initialGameView);
    }
    previousTokenRef.current = currentToken;
  }, [currentToken]);

  useEffect(() => {
    if (!usesLocalTestMedia) return;
    let active = true;
    setLocalSession(undefined);
    setLocalSessionError(undefined);
    void fetchLocalTestSession(currentToken).then(
      (nextSession) => {
        if (active) {
          setLocalSession(nextSession);
          if (
            nextSession.photos.length > 0 &&
            !nextSession.photos.some((photo) => photo.id === selectedPhotoId)
          ) {
            setSelectedPhotoId(nextSession.photos[0]!.id);
          }
        }
      },
      (error: unknown) => {
        if (active) {
          setLocalSessionError(
            error instanceof Error
              ? error.message
              : 'Não foi possível abrir a sessão local de teste.',
          );
        }
      },
    );
    return () => {
      active = false;
    };
  }, [usesLocalTestMedia, currentToken]);

  const writeRoute = useCallback(
    (nextRoute: PublicRoute, mode: Exclude<HistoryMode, 'none'>) => {
      const nextIndex =
        mode === 'push' ? navigationIndexRef.current + 1 : navigationIndexRef.current;
      const state: HistoryState = { christmasGamesIndex: nextIndex };
      window.history[mode === 'push' ? 'pushState' : 'replaceState'](
        state,
        '',
        `${routePath(nextRoute)}${localTestMediaSearch}`,
      );
      navigationIndexRef.current = nextIndex;
      setRoute(nextRoute);
    },
    [localTestMediaSearch],
  );

  useEffect(() => {
    if (
      initialRoute.kind === 'theme-lab' ||
      initialRoute.kind === 'experience-lab' ||
      initialRoute.kind === 'asset-lab' ||
      initialRoute.kind === 'performance-lab'
    ) {
      return;
    }
    const state = window.history.state as HistoryState | null;
    if (typeof state?.christmasGamesIndex !== 'number') {
      window.history.replaceState(
        { christmasGamesIndex: navigationIndexRef.current },
        '',
        `${routePath(initialRoute)}${localTestMediaSearch}`,
      );
    }
  }, [initialRoute, localTestMediaSearch]);

  const requestGameExit = useCallback((nextRoute: AppRoute, mode: HistoryMode): void => {
    pendingNavigationRef.current = { mode, route: nextRoute };
    setExitRequest((request) => request + 1);
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent): void => {
      if (route.kind === 'session') hubScrollRef.current = window.scrollY;
      if (route.kind === 'gallery') galleryScrollRef.current = window.scrollY;
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
  }, [requestGameExit, route.kind]);

  const prefetch = (gameId: string): void => {
    if (!getInstalledGame(gameId)) return;
    prefetchGame(gameId as Parameters<typeof prefetchGame>[0]);
  };

  const openGame = (gameId: string): void => {
    const game = getInstalledGame(gameId);
    if (
      !game ||
      session.photos.length < game.definition.minPhotos ||
      (route.kind !== 'session' && route.kind !== 'gallery' && route.kind !== 'game-cover')
    )
      return;
    if (route.kind === 'session') hubScrollRef.current = window.scrollY;
    if (route.kind === 'gallery') galleryScrollRef.current = window.scrollY;
    writeRoute({ kind: 'game-cover', token: route.token, gameId }, 'push');
  };

  const openGallery = (): void => {
    if (route.kind !== 'session') return;
    hubScrollRef.current = window.scrollY;
    writeRoute({ kind: 'gallery', token: route.token }, 'push');
  };

  const goToSession = (token: string): void => {
    const sessionRoute: SessionRoute = { kind: 'session', token };
    if (route.kind === 'gallery') galleryScrollRef.current = window.scrollY;
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
    setDifficulty('normal');
    playingRef.current = true;
    setGameView(initialGameView);
    setPlaying(true);
  };

  const retry = (): void => {
    setGameView(initialGameView);
    setGameAttempt((attempt) => attempt + 1);
  };

  const startChallenge = (): void => {
    setDifficulty('desafio');
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
      pending.route.kind !== 'asset-lab' &&
      pending.route.kind !== 'performance-lab' &&
      pending.mode !== 'none'
    ) {
      writeRoute(pending.route, pending.mode);
      return;
    }
    setRoute(pending.route);
  };

  const isDevelopmentRoute =
    route.kind === 'theme-lab' ||
    route.kind === 'experience-lab' ||
    route.kind === 'asset-lab' ||
    route.kind === 'performance-lab';

  if (isDevelopmentRoute && releaseMode !== 'development') {
    return (
      <main className="shell unavailable-game" role="alert">
        <p className="eyebrow">ROTA NÃO PUBLICADA</p>
        <h1>Este laboratório existe somente no ambiente local.</h1>
      </main>
    );
  }

  if (route.kind === 'theme-lab') return <ThemeLab />;
  if (route.kind === 'experience-lab') return <ExperienceLab />;
  if (route.kind === 'asset-lab') return <AssetLab />;
  if (route.kind === 'performance-lab') {
    return PerformanceLab ? (
      <Suspense
        fallback={
          <main className="shell unavailable-game" role="status">
            <p className="eyebrow">DESENVOLVIMENTO LOCAL</p>
            <h1>Preparando medição…</h1>
          </main>
        }
      >
        <PerformanceLab />
      </Suspense>
    ) : (
      <main className="shell unavailable-game" role="alert">
        <p className="eyebrow">DESENVOLVIMENTO LOCAL</p>
        <h1>Este laboratório não está publicado.</h1>
      </main>
    );
  }

  if (releaseMode === 'production-disabled') {
    return (
      <main className="shell unavailable-game" role="alert">
        <p className="eyebrow">PUBLICAÇÃO PROTEGIDA</p>
        <h1>As sessões privadas ainda não foram ativadas neste release.</h1>
        <p>Use o build staging-demo apenas para validação sintética na VPS.</p>
      </main>
    );
  }

  if (usesLocalTestMedia && !localSession) {
    return (
      <main className="shell unavailable-game" role="status">
        <p className="eyebrow">TESTE LOCAL</p>
        <h1>{localSessionError ? 'Sessão local indisponível' : 'Preparando fotos para o jogo…'}</h1>
        {localSessionError ? <p>{localSessionError}</p> : null}
      </main>
    );
  }

  if (route.kind === 'gallery') {
    return (
      <Suspense
        fallback={
          <main className="shell unavailable-game" role="status">
            <p className="eyebrow">SEU ÁLBUM DE NATAL</p>
            <h1>Preparando suas lembranças…</h1>
          </main>
        }
      >
        <SessionGallery
          key={session.id}
          session={session}
          selectedPhotoId={selectedPhoto.id}
          calm={calm}
          lowQuality={quality === 'LOW'}
          onSelectPhoto={setSelectedPhotoId}
          onBack={() => goToSession(route.token)}
          onPlayPhoto={(photoId) => {
            setSelectedPhotoId(photoId);
            openGame('puzzle-swap');
          }}
        />
      </Suspense>
    );
  }

  if (route.kind === 'session') {
    return (
      <Hub
        {...shellControls}
        lowQuality={quality === 'LOW'}
        fixtureCount={fixtureCount}
        games={gameDefinitions}
        onFixtureChange={setFixtureCount}
        onOpenGame={openGame}
        onOpenGallery={openGallery}
        onPrefetchGame={prefetch}
        onSelectPhoto={setSelectedPhotoId}
        selectedPhotoId={selectedPhoto.id}
        session={session}
        showFixtureSelector={releaseMode === 'development' && !usesLocalTestMedia}
      />
    );
  }

  const gameRoute = route as GameCoverRoute;
  const game = getInstalledGame(gameRoute.gameId);
  const availablePhotoCount = new Set(session.photos.map((photo) => photo.id)).size;
  const canOfferMoreMemoryCards =
    gameRoute.gameId === 'memory' &&
    difficulty !== 'desafio' &&
    availablePhotoCount >= memoryStandardPairCount;
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
    if (session.photos.length < game.definition.minPhotos) {
      return (
        <main className="shell unavailable-game" role="alert">
          <p className="eyebrow">FOTOS INSUFICIENTES</p>
          <h1>Esta brincadeira precisa de pelo menos {game.definition.minPhotos} fotos.</h1>
          <button className="button" type="button" onClick={() => goToSession(gameRoute.token)}>
            Voltar para a sessão
          </button>
        </main>
      );
    }
    return (
      <GameCover
        {...shellControls}
        lowQuality={quality === 'LOW'}
        session={session}
        onSelectPhoto={setSelectedPhotoId}
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
      calm={calm || quality === 'LOW'}
      definition={game.definition}
      eventSequence={gameView.eventSequence}
      lastEvent={gameView.lastEvent}
      onExit={() => goToSession(gameRoute.token)}
      onBrowseGames={() => goToSession(gameRoute.token)}
      onRetry={retry}
      status={gameView.status}
      {...(gameRoute.gameId === 'puzzle-swap'
        ? { onChallenge: startChallenge }
        : canOfferMoreMemoryCards
          ? { challengeLabel: 'Mais cartas', onChallenge: startChallenge }
          : {})}
    >
      <PhaserHost
        bridge={services.bridge}
        context={context}
        exitRequest={exitRequest}
        gameId={gameRoute.gameId as Parameters<typeof prefetchGame>[0]}
        key={gameAttempt}
        onExit={handleGameExit}
        onSoundChange={(enabled) => {
          soundPreferenceRef.current = enabled;
          setInterfaceSoundEnabled(enabled);
          setSoundEnabled(enabled);
        }}
        onStateChange={(status, lastEvent, eventSequence) => {
          setGameView((current) =>
            eventSequence < current.eventSequence ||
            (current.status === status &&
              current.lastEvent === lastEvent &&
              current.eventSequence === eventSequence)
              ? current
              : { eventSequence, status, lastEvent },
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
