import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PresentationFrameSampler, createFixtureSession } from '@christmas-games/platform';
import type { FrameTimingSummary, GameContextSeed } from '@christmas-games/platform';
import {
  planPuzzlePerformanceScenario,
  type PuzzlePerformanceScenario,
  type PuzzlePerformanceScenarioPlan,
} from '@christmas-games/puzzle-swap/performance-lab';
import { PhaserHost } from '../phaser/PhaserHost.js';
import type { PhaserHostStatus } from '../phaser/PhaserHost.js';
import { createAppServices } from '../app/AppServices.js';
import { useExperienceSettings } from '../app/ExperienceSettings.js';

interface ResourceSnapshot {
  readonly canvasCount: number;
  readonly hostCount: number;
  readonly metricsEventCount: number;
  readonly point: string;
}

const scenarios: readonly { readonly value: PuzzlePerformanceScenario; readonly label: string }[] =
  [
    { value: 'idle', label: 'Ocioso' },
    { value: 'selection', label: 'Escolha de peça' },
    { value: 'hint', label: 'Dica' },
    { value: 'correct', label: 'Acerto' },
    { value: 'victory', label: 'Vitória' },
    { value: 'pause', label: 'Pausa' },
    { value: 'restart', label: 'Recomeçar' },
    { value: 'exit', label: 'Sair' },
  ];

const frameThresholdMs = 1000 / 50;
const emptySummary: FrameTimingSummary = {
  framesAboveThreshold: 0,
  p50Ms: undefined,
  p95Ms: undefined,
  p99Ms: undefined,
  sampleCount: 0,
  thresholdMs: frameThresholdMs,
};

/**
 * Local development proof for the real Puzzle Swap mount. It uses only the
 * public SVG fixture and keeps all observations in React memory: neither a
 * photo, a session token nor a timing measurement is sent anywhere.
 */
export function PerformanceLab(): React.JSX.Element {
  const [settings, updateSetting] = useExperienceSettings();
  const services = useMemo(createAppServices, []);
  const session = useMemo(() => createFixtureSession(12), []);
  const selectedPhoto = useMemo(
    () =>
      session.photos.find((photo) => photo.orientation === settings.photo) ?? session.photos[0]!,
    [session.photos, settings.photo],
  );
  const runSeed = Number(settings.seed);
  const [activeScenario, setActiveScenario] = useState<PuzzlePerformanceScenario>();
  const context = useMemo<GameContextSeed>(
    () => ({
      session,
      selectedPhoto,
      clock: { now: () => performance.now() },
      analytics: services.analytics,
      haptics: services.haptics,
      quality: settings.quality,
      preferences: {
        reducedMotion: settings.motion === 'reduced',
        soundEnabled: settings.soundEnabled,
      },
      ...(activeScenario ? { development: { scenario: activeScenario } } : {}),
    }),
    [
      activeScenario,
      selectedPhoto,
      services,
      session,
      settings.motion,
      settings.quality,
      settings.soundEnabled,
    ],
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const samplerRef = useRef<PresentationFrameSampler | undefined>(undefined);
  const timerIdsRef = useRef<number[]>([]);
  const queuedScenarioRef = useRef<PuzzlePerformanceScenario | undefined>(undefined);
  const nextScenarioRef = useRef<PuzzlePerformanceScenario | undefined>(undefined);
  const afterExitRef = useRef<'restart' | undefined>(undefined);
  const awaitingRemountCaptureRef = useRef(false);
  const teardownPendingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [exitRequest, setExitRequest] = useState(0);
  const [status, setStatus] = useState<PhaserHostStatus>('loading');
  const [gameEvent, setGameEvent] = useState('NONE');
  const [selectedScenario, setSelectedScenario] = useState<PuzzlePerformanceScenario>('idle');
  const [scenarioRequest, setScenarioRequest] = useState(0);
  const [lastPlan, setLastPlan] = useState<PuzzlePerformanceScenarioPlan>();
  const [summary, setSummary] = useState<FrameTimingSummary>(emptySummary);
  const [snapshots, setSnapshots] = useState<readonly ResourceSnapshot[]>([]);

  const clearTimers = useCallback((): void => {
    timerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timerIdsRef.current = [];
  }, []);

  const capture = useCallback(
    (point: string): void => {
      const stage = stageRef.current;
      const snapshot: ResourceSnapshot = {
        point,
        canvasCount: stage?.querySelectorAll('canvas').length ?? 0,
        hostCount: stage?.querySelectorAll('.phaser-host').length ?? 0,
        metricsEventCount: services.analytics.events.length,
      };
      setSnapshots((current) => [...current.slice(-5), snapshot]);
    },
    [services.analytics.events],
  );

  useEffect(() => {
    const sampler = new PresentationFrameSampler(
      {
        requestFrame: (callback) => window.requestAnimationFrame(callback),
        cancelFrame: (requestId) => window.cancelAnimationFrame(requestId),
      },
      frameThresholdMs,
    );
    samplerRef.current = sampler;
    return () => {
      sampler.stop();
      samplerRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const sampler = samplerRef.current;
    if (!mounted || !sampler) return;
    sampler.reset();
    sampler.start();
    const intervalId = window.setInterval(() => setSummary(sampler.summary()), 400);
    return () => {
      window.clearInterval(intervalId);
      setSummary(sampler.stop());
    };
  }, [mounted]);

  useEffect(
    () => () => {
      clearTimers();
    },
    [clearTimers],
  );

  const requestDestroy = useCallback(
    (afterExit?: 'restart'): void => {
      if (!mounted) return;
      clearTimers();
      afterExitRef.current = afterExit;
      teardownPendingRef.current = true;
      setExitRequest((request) => request + 1);
    },
    [clearTimers, mounted],
  );

  const runPlan = useCallback(
    (scenario: PuzzlePerformanceScenario): void => {
      clearTimers();
      setLastPlan(undefined);
      if (scenario === 'exit') {
        queuedScenarioRef.current = undefined;
        nextScenarioRef.current = undefined;
        setLastPlan(lifecyclePlan(scenario));
        if (mounted) requestDestroy();
        else capture('já desmontada');
        return;
      }
      if (scenario === 'restart') {
        queuedScenarioRef.current = undefined;
        nextScenarioRef.current = undefined;
        awaitingRemountCaptureRef.current = true;
        setLastPlan(lifecyclePlan(scenario));
        if (mounted) requestDestroy('restart');
        else {
          capture('antes de montar');
          setActiveScenario(undefined);
          setGameEvent('NONE');
          setStatus('loading');
          setMounted(true);
        }
        return;
      }
      queuedScenarioRef.current = scenario;
      nextScenarioRef.current = scenario;
      setScenarioRequest((request) => request + 1);
      if (mounted) {
        requestDestroy('restart');
        return;
      }
      capture('antes de montar');
      setActiveScenario(scenario);
      setGameEvent('NONE');
      setStatus('loading');
      setMounted(true);
    },
    [capture, clearTimers, mounted, requestDestroy],
  );

  useEffect(() => {
    const scenario = queuedScenarioRef.current;
    if (!mounted || gameEvent !== 'GAME_STARTED') return;
    if (!scenario) {
      if (awaitingRemountCaptureRef.current) {
        awaitingRemountCaptureRef.current = false;
        capture('partida remontada');
      }
      return;
    }
    queuedScenarioRef.current = undefined;
    const stage = stageRef.current;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const plan = planPuzzlePerformanceScenario({
      scenario,
      runSeed,
      photoAspectRatio: selectedPhoto.aspectRatio,
      width: stage.querySelector('canvas')?.getBoundingClientRect().width ?? bounds.width,
      height: stage.querySelector('canvas')?.getBoundingClientRect().height ?? bounds.height,
    });
    setLastPlan(plan);
    capture('partida pronta');

    if (plan.action === 'restart') {
      requestDestroy('restart');
      return;
    }
    if (plan.action === 'exit') {
      requestDestroy();
      return;
    }
    const proofDelay =
      plan.scenario === 'victory' ? Math.max(1_200, 480 + plan.tapSequence.length * 240) : 1_100;
    const proofTimer = window.setTimeout(() => capture(`após ${plan.scenario}`), proofDelay);
    timerIdsRef.current.push(proofTimer);
  }, [
    capture,
    gameEvent,
    mounted,
    requestDestroy,
    runSeed,
    scenarioRequest,
    selectedPhoto.aspectRatio,
  ]);

  useEffect(() => {
    if (mounted || !teardownPendingRef.current) return;
    teardownPendingRef.current = false;
    capture('depois de desmontar');
    if (afterExitRef.current !== 'restart') return;
    afterExitRef.current = undefined;
    const timerId = window.setTimeout(() => {
      capture('antes de remontar');
      setAttempt((current) => current + 1);
      setActiveScenario(nextScenarioRef.current);
      setGameEvent('NONE');
      setStatus('loading');
      setMounted(true);
    }, 0);
    timerIdsRef.current.push(timerId);
  }, [capture, mounted]);

  return (
    <main className="shell performance-lab">
      <p className="eyebrow">DESENVOLVIMENTO LOCAL</p>
      <h1>Laboratório de desempenho</h1>
      <p className="intro">
        A partida abaixo usa a foto ilustrativa pública. Os números ficam somente neste navegador;
        não há foto de cliente, token ou envio de métricas.
      </p>

      <div className="experience-controls" aria-label="Condições da medição">
        <label className="field">
          Qualidade
          <select
            data-testid="performance-quality"
            value={settings.quality}
            onChange={(event) =>
              updateSetting('quality', event.target.value as GameContextSeed['quality'])
            }
          >
            <option value="LOW">Economia de dados</option>
            <option value="NORMAL">Equilibrada</option>
            <option value="HIGH">Mais efeitos</option>
          </select>
        </label>
        <label className="field">
          Movimento
          <select
            data-testid="performance-motion"
            value={settings.motion}
            onChange={(event) =>
              updateSetting('motion', event.target.value === 'reduced' ? 'reduced' : 'full')
            }
          >
            <option value="full">Movimento completo</option>
            <option value="reduced">Movimento reduzido</option>
          </select>
        </label>
        <label className="field">
          Foto ilustrativa
          <select
            data-testid="performance-photo"
            value={settings.photo}
            onChange={(event) =>
              updateSetting('photo', event.target.value === 'landscape' ? 'landscape' : 'portrait')
            }
          >
            <option value="portrait">Vertical</option>
            <option value="landscape">Horizontal</option>
          </select>
        </label>
        <label className="field">
          Som
          <select
            data-testid="performance-sound"
            value={settings.soundEnabled ? 'on' : 'off'}
            onChange={(event) => updateSetting('soundEnabled', event.target.value === 'on')}
          >
            <option value="on">Ligado</option>
            <option value="off">Silencioso</option>
          </select>
        </label>
      </div>

      <div className="performance-lab-actions">
        <label className="field">
          Cenário reproduzível
          <select
            data-testid="performance-scenario"
            value={selectedScenario}
            onChange={(event) =>
              setSelectedScenario(event.target.value as PuzzlePerformanceScenario)
            }
          >
            {scenarios.map((scenario) => (
              <option key={scenario.value} value={scenario.value}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button"
          data-testid="performance-run"
          type="button"
          onClick={() => runPlan(selectedScenario)}
        >
          Medir cenário
        </button>
        <button
          className="button secondary"
          data-testid="performance-destroy"
          disabled={!mounted}
          type="button"
          onClick={() => requestDestroy()}
        >
          Desmontar partida
        </button>
      </div>

      <section className="performance-lab-stage" ref={stageRef} aria-label="Partida medida">
        {mounted ? (
          <PhaserHost
            bridge={services.bridge}
            context={context}
            exitRequest={exitRequest}
            gameId="puzzle-swap"
            key={attempt}
            runSeed={runSeed}
            onExit={() => setMounted(false)}
            onStateChange={(nextStatus, lastEvent) => {
              setStatus(nextStatus);
              setGameEvent(lastEvent);
            }}
          />
        ) : (
          <p className="performance-lab-empty" data-testid="performance-empty">
            A superfície está desmontada. Escolha um cenário para criar a partida real.
          </p>
        )}
      </section>

      <section className="performance-lab-report" aria-live="polite">
        <h2>Leitura atual</h2>
        <dl data-testid="performance-metrics">
          <div>
            <dt>Estado</dt>
            <dd>{mounted ? `${status} · ${gameEvent}` : 'desmontada'}</dd>
          </div>
          <div>
            <dt>Amostras</dt>
            <dd>{summary.sampleCount}</dd>
          </div>
          <div>
            <dt>Mediana</dt>
            <dd>{formatMilliseconds(summary.p50Ms)}</dd>
          </div>
          <div>
            <dt>95%</dt>
            <dd>{formatMilliseconds(summary.p95Ms)}</dd>
          </div>
          <div>
            <dt>99%</dt>
            <dd>{formatMilliseconds(summary.p99Ms)}</dd>
          </div>
          <div>
            <dt>Acima de {Math.round(summary.thresholdMs)} ms</dt>
            <dd>{summary.framesAboveThreshold}</dd>
          </div>
        </dl>
        <p className="hint" data-testid="performance-plan">
          {lastPlan
            ? `${lastPlan.scenario}: ${lastPlan.description}`
            : `Combinação fixa: ${settings.seed}. Ainda não há cenário executado.`}
        </p>
      </section>

      <section className="performance-lab-report" aria-live="polite">
        <h2>Prova de recursos</h2>
        <p className="hint">
          Após desmontar, telas e áreas Phaser precisam retornar a zero. O contador de eventos é
          apenas local e serve para comparar cada ciclo.
        </p>
        <div className="performance-snapshots" data-testid="performance-snapshots">
          {snapshots.length === 0 ? <p>Nenhuma montagem medida ainda.</p> : null}
          {snapshots.map((snapshot, index) => (
            <p key={`${snapshot.point}-${index}`}>
              <strong>{snapshot.point}:</strong> {snapshot.canvasCount} tela(s),{' '}
              {snapshot.hostCount} área(s) do jogo, {snapshot.metricsEventCount} evento(s) locais.
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}

function formatMilliseconds(value: number | undefined): string {
  return value === undefined ? '—' : `${value.toFixed(1)} ms`;
}

function lifecyclePlan(scenario: 'restart' | 'exit'): PuzzlePerformanceScenarioPlan {
  return scenario === 'restart'
    ? {
        action: 'restart',
        description: 'Desmonta e monta outra partida com a mesma combinação.',
        scenario,
        tapSpacingMs: 0,
        tapSequence: [],
      }
    : {
        action: 'exit',
        description: 'Desmonta a partida e verifica a superfície vazia.',
        scenario,
        tapSpacingMs: 0,
        tapSequence: [],
      };
}
