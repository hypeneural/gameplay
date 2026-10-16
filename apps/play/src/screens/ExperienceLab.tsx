import { useEffect, useMemo, useState } from 'react';
import { createFixtureSession } from '@christmas-games/platform';
import { createChristmasEffects } from '@christmas-games/theme';
import type {
  FeedbackCue,
  FeedbackInstruction,
  MotionPreference,
  QualityProfile,
} from '@christmas-games/theme';
import { useExperienceSettings, type ExperiencePhotoShape } from '../app/ExperienceSettings.js';
import { ChristmasLoadingExperience } from '../components/ChristmasLoadingExperience.js';
import { gameDefinitions } from '../phaser/gameRegistry.js';
import type { PhaserLoadPhase } from '../phaser/loadStateMachine.js';

const feedbackCues: readonly FeedbackCue[] = [
  'tap',
  'select',
  'correct',
  'wrong',
  'hint',
  'celebrate',
];

const cueLabels: Record<FeedbackCue, string> = {
  tap: 'Toque',
  select: 'Escolha',
  correct: 'Acertou',
  wrong: 'Tente de novo',
  hint: 'Dica',
  celebrate: 'Comemoração',
};

const loadingPhaseOptions: readonly { readonly value: PhaserLoadPhase; readonly label: string }[] =
  [
    { value: 'importing', label: '1. Importando motor' },
    { value: 'waiting_mount', label: '2. Aguardando montagem' },
    { value: 'loading_assets', label: '3. Carregando recursos (%)' },
    { value: 'preparing_scene', label: '4. Preparando cenário' },
  ];

function photoShapeLabel(shape: ExperiencePhotoShape): string {
  return shape === 'landscape' ? 'horizontal' : 'vertical';
}

function qualityLabel(quality: QualityProfile): string {
  if (quality === 'LOW') return 'Economia de dados';
  if (quality === 'HIGH') return 'Mais efeitos';
  return 'Equilibrada';
}

/** Deterministic dev-only reference for the shared feedback vocabulary. */
export function ExperienceLab(): React.JSX.Element {
  const [settings, update] = useExperienceSettings();
  const [lastInstruction, setLastInstruction] = useState<FeedbackInstruction | undefined>(
    undefined,
  );
  const [loadingGameId, setLoadingGameId] = useState<string>('puzzle-swap');
  const [loadingPhase, setLoadingPhase] = useState<PhaserLoadPhase>('loading_assets');
  const [loadingPercent, setLoadingPercent] = useState<number>(64);
  const [simulatingLoading, setSimulatingLoading] = useState<boolean>(false);

  const session = useMemo(() => createFixtureSession(12), []);
  const selectedPhoto = useMemo(() => {
    const base =
      session.photos.find((photo) => photo.orientation === settings.photo) ?? session.photos[0]!;
    return {
      ...base,
      variants: {
        ...base.variants,
        thumb: `${base.variants.thumb}#preview`,
      },
    };
  }, [session.photos, settings.photo]);
  const selectedGame = useMemo(
    () => gameDefinitions.find((game) => game.id === loadingGameId),
    [loadingGameId],
  );

  useEffect(() => {
    if (!simulatingLoading) return;
    let step = 0;
    setLoadingPhase('importing');
    setLoadingPercent(0);
    const timer = window.setInterval(() => {
      step += 1;
      if (step === 1) {
        setLoadingPhase('waiting_mount');
      } else if (step >= 2 && step <= 11) {
        setLoadingPhase('loading_assets');
        setLoadingPercent(Math.min(99, (step - 1) * 10));
      } else if (step === 12) {
        setLoadingPhase('preparing_scene');
        setLoadingPercent(99);
      } else {
        setSimulatingLoading(false);
      }
    }, 420);
    return () => window.clearInterval(timer);
  }, [simulatingLoading]);

  const feel = useMemo(
    () =>
      createChristmasEffects<string>(
        {
          quality: settings.quality,
          motion: settings.motion,
          soundEnabled: settings.soundEnabled,
        },
        {
          animate: (_target, instruction) => setLastInstruction(instruction),
        },
      ),
    [settings.motion, settings.quality, settings.soundEnabled],
  );

  return (
    <main className="shell experience-lab">
      <p className="eyebrow">DESENVOLVIMENTO</p>
      <h1>Laboratório da brincadeira</h1>
      <p className="intro">
        Referência determinística para toque, movimento e qualidade antes de criar um jogo.
      </p>
      <div className="experience-controls" aria-label="Controles de experiência">
        <label className="field">
          Qualidade
          <select
            data-testid="experience-quality"
            value={settings.quality}
            onChange={(event) => update('quality', event.target.value as QualityProfile)}
          >
            <option value="LOW">Economia de dados</option>
            <option value="NORMAL">Equilibrada</option>
            <option value="HIGH">Mais efeitos</option>
          </select>
        </label>
        <label className="field">
          Movimento
          <select
            data-testid="experience-motion"
            value={settings.motion}
            onChange={(event) => update('motion', event.target.value as MotionPreference)}
          >
            <option value="full">Movimento completo</option>
            <option value="reduced">Movimento reduzido</option>
          </select>
        </label>
        <label className="field">
          Foto
          <select
            data-testid="experience-photo"
            value={settings.photo}
            onChange={(event) => update('photo', event.target.value as ExperiencePhotoShape)}
          >
            <option value="portrait">Vertical</option>
            <option value="landscape">Horizontal</option>
          </select>
        </label>
        <label className="field">
          Som
          <select
            data-testid="experience-sound"
            value={settings.soundEnabled ? 'on' : 'off'}
            onChange={(event) => update('soundEnabled', event.target.value === 'on')}
          >
            <option value="on">Ligado</option>
            <option value="off">Silencioso</option>
          </select>
        </label>
      </div>
      <section
        className={`experience-preview ${settings.photo} ${lastInstruction?.cue ?? 'idle'}`}
        data-testid="experience-preview"
        data-motion={settings.motion}
        data-quality={settings.quality}
        aria-label={`Prévia ${photoShapeLabel(settings.photo)}; ${qualityLabel(settings.quality)}; combinação ${settings.seed}`}
      >
        <div className="experience-photo-surface">FOTO</div>
        <div className="experience-feedback" aria-live="polite">
          {lastInstruction
            ? `${cueLabels[lastInstruction.cue]} · ${lastInstruction.motion.durationMs} ms`
            : 'PRONTO PARA BRINCAR'}
        </div>
        {lastInstruction?.particles ? (
          <span className="experience-particles" data-testid="experience-particles">
            ✦ {lastInstruction.particles.count}
          </span>
        ) : null}
      </section>
      <div className="experience-cues" aria-label="Respostas ao toque">
        {feedbackCues.map((cue) => (
          <button
            className="button secondary"
            data-testid={`experience-${cue}`}
            key={cue}
            type="button"
            onClick={() => feel.apply(cue, 'preview')}
          >
            {cueLabels[cue]}
          </button>
        ))}
      </div>
      <p className="hint" data-testid="experience-seed">
        Combinação fixa: {settings.seed}. O som é testado dentro do jogo depois do primeiro toque.
      </p>

      <section
        className="experience-loading-showcase"
        aria-label="Prévia da Moldura Mágica de Carregamento"
      >
        <p className="eyebrow">MOLDURA MÁGICA DE NATAL</p>
        <h2>Tela de carregamento interativa</h2>
        <p className="intro">
          Toque nas 3 estrelas de cristal douradas (≥ 52×52px) abaixo da moldura ou simule o avanço
          das fases reais do Phaser.Loader.
        </p>
        <div className="experience-controls" aria-label="Controles do carregamento">
          <label className="field">
            Modo / Jogo
            <select
              value={loadingGameId}
              onChange={(event) => setLoadingGameId(event.target.value)}
            >
              {gameDefinitions.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.displayName}
                </option>
              ))}
              <option value="__session__">Abertura do Álbum (Sessão)</option>
            </select>
          </label>
          <label className="field">
            Fase
            <select
              value={loadingPhase}
              onChange={(event) => {
                setSimulatingLoading(false);
                setLoadingPhase(event.target.value as PhaserLoadPhase);
              }}
            >
              {loadingPhaseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Progresso ({loadingPercent}%)
            <input
              type="range"
              min={0}
              max={99}
              value={loadingPercent}
              onChange={(event) => {
                setSimulatingLoading(false);
                setLoadingPhase('loading_assets');
                setLoadingPercent(Number(event.target.value));
              }}
            />
          </label>
          <div className="field">
            Simulação
            <button
              className="button secondary"
              type="button"
              onClick={() => setSimulatingLoading((current) => !current)}
            >
              {simulatingLoading ? 'Pausar ciclo' : 'Animar 0% → 99%'}
            </button>
          </div>
        </div>
        <div className="experience-loading-stage">
          {loadingGameId === '__session__' ? (
            <ChristmasLoadingExperience
              mode="session"
              eyebrow="SEU ÁLBUM DE NATAL"
              title="Carregando suas lembranças de Natal…"
              calm={settings.motion === 'reduced'}
              lowQuality={settings.quality === 'LOW'}
            />
          ) : (
            <ChristmasLoadingExperience
              mode="game"
              title={`Abrindo ${selectedGame?.displayName ?? 'Jogo'}…`}
              definition={selectedGame}
              photo={selectedPhoto}
              phase={loadingPhase}
              progress={loadingPhase === 'loading_assets' ? loadingPercent / 100 : undefined}
              calm={settings.motion === 'reduced'}
              lowQuality={settings.quality === 'LOW'}
            />
          )}
        </div>
      </section>
    </main>
  );
}
