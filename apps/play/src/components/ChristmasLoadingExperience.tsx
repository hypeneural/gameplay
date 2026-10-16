import { useEffect, useRef, useState } from 'react';
import type { GameDefinition, Photo } from '@christmas-games/platform';
import { playInterfaceTap, stopInterfaceTap } from '../audio/playInterfaceTap.js';
import type { PhaserLoadPhase } from '../phaser/PhaserHost.js';

export interface ChristmasLoadingExperienceProps {
  mode?: 'game' | 'session' | undefined;
  title: string;
  eyebrow?: string | undefined;
  definition?: GameDefinition | undefined;
  photo?: Photo | undefined;
  phase?: PhaserLoadPhase | undefined;
  progress?: number | undefined;
  retryAttempt?: number | undefined;
  calm?: boolean | undefined;
  lowQuality?: boolean | undefined;
  testId?: string | undefined;
}

interface StarBurst {
  id: number;
  starIndex: number;
}

const STAR_LABELS = [
  'Acender estrela da esquerda',
  'Acender estrela central',
  'Acender estrela da direita',
] as const;

const GAME_ASSET_MESSAGES: Readonly<Record<string, string>> = {
  'puzzle-swap': 'Recortando as peças douradas da sua foto…',
  memory: 'Preparando os pares do seu álbum de Natal…',
  'tic-tac-toe': 'Arrumando o mural da Trinca de Natal…',
  'expresso-das-fotos': 'Engatando os vagões do Expresso de Natal…',
  'mosaico-em-queda': 'Alinhando os ladrilhos luminosos da sua foto…',
  'guirlanda-das-lembrancas': 'Entrelaçando ramos e luzes na sua guirlanda…',
  'magic-photo': 'Cobrindo sua lembrança com neve mágica…',
  'rena-das-lembrancas': 'Preparando o voo da Rena pelas suas memórias…',
  'globo-das-lembrancas': 'Polindo o cristal do Globo das Lembranças…',
  'estilingue-das-lembrancas': 'Pendurando os enfeites na sala de Natal…',
  'lanterna-magica': 'Alinhando os cristais da Lanterna Mágica…',
};

export function resolveLoadingPhaseMessage(
  mode: 'game' | 'session',
  phase: PhaserLoadPhase | undefined,
  gameId: string | undefined,
  retryAttempt: number | undefined,
): string {
  if (retryAttempt && retryAttempt > 0) {
    return `Reconectando sua lembrança de Natal (tentativa ${retryAttempt})…`;
  }
  if (mode === 'session') {
    return 'Buscando as fotografias autorizadas da sua família…';
  }
  switch (phase) {
    case 'importing':
      return 'Abrindo a oficina de Natal…';
    case 'waiting_mount':
      return 'Preparando a moldura para a sua lembrança…';
    case 'preparing_scene':
      return 'Acendendo as luzes da cena de Natal…';
    case 'loading_assets':
    default:
      return (
        (gameId ? GAME_ASSET_MESSAGES[gameId] : undefined) ??
        'Revelando sua fotografia com carinho…'
      );
  }
}

export function ChristmasLoadingExperience({
  mode = 'game',
  title,
  eyebrow = mode === 'session' ? 'SEU ÁLBUM DE NATAL' : 'MOLDURA MÁGICA DE NATAL',
  definition,
  photo,
  phase = 'loading_assets',
  progress,
  retryAttempt,
  calm = false,
  lowQuality = false,
  testId = mode === 'game' ? 'game-loading' : 'session-loading',
}: ChristmasLoadingExperienceProps): React.JSX.Element {
  const reducedMotion =
    calm ||
    lowQuality ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const [documentHidden, setDocumentHidden] = useState<boolean>(
    typeof document !== 'undefined' && document.hidden,
  );
  const [litStars, setLitStars] = useState<readonly [boolean, boolean, boolean]>([
    false,
    true,
    false,
  ]);
  const [bursts, setBursts] = useState<readonly StarBurst[]>([]);
  const burstIdRef = useRef(0);
  const timersRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timers = timersRef.current;
    const clearAllTimers = (): void => {
      for (const id of timers) {
        window.clearTimeout(id);
      }
      timers.clear();
    };
    const handleVisibilityChange = (): void => {
      const hidden = document.hidden;
      setDocumentHidden(hidden);
      if (hidden) {
        clearAllTimers();
        setBursts([]);
        stopInterfaceTap();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllTimers();
    };
  }, []);

  // Only render the thumb preview when it is a distinct derivative from `game`
  // so synthetic single-URL fixtures never trigger an extra request during preload.
  const canShowThumbPreview = Boolean(
    photo &&
    photo.variants.thumb &&
    photo.variants.game &&
    photo.variants.thumb !== photo.variants.game,
  );

  // Never display 100% before GAME_READY actually closes the loading screen.
  const hasRealProgress = typeof progress === 'number' && Number.isFinite(progress) && progress > 0;
  const displayPercent = hasRealProgress
    ? Math.min(99, Math.max(1, Math.round(progress * 100)))
    : undefined;

  const phaseMessage = resolveLoadingPhaseMessage(mode, phase, definition?.id, retryAttempt);

  const handleStarClick = (starIndex: 0 | 1 | 2): void => {
    playInterfaceTap('magic');
    setLitStars((current) => {
      const next: [boolean, boolean, boolean] = [...current];
      next[starIndex] = !next[starIndex] || true;
      return next;
    });
    if (reducedMotion || documentHidden) return;

    const id = ++burstIdRef.current;
    setBursts((current) => [...current.slice(-3), { id, starIndex }]);
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(timerId);
      setBursts((current) => current.filter((item) => item.id !== id));
    }, 560);
    timersRef.current.add(timerId);
  };

  return (
    <div
      className={`game-loading christmas-loading christmas-loading--${mode}`}
      data-calm={reducedMotion ? 'true' : 'false'}
      data-hidden={documentHidden ? 'true' : undefined}
      data-phase={phase}
      data-quality={lowQuality ? 'LOW' : undefined}
      data-testid={testId}
      role="status"
    >
      <div className="christmas-loading__glow" aria-hidden="true" />
      {reducedMotion || documentHidden ? null : (
        <div className="christmas-loading__snow" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      <div className="christmas-loading__card">
        <div className="christmas-loading__garland" aria-hidden="true" />
        <div className="christmas-loading__lights" aria-hidden="true">
          <span className="christmas-loading__bulb" />
          <span className="christmas-loading__bulb" />
          <span className="christmas-loading__bulb" />
          <span className="christmas-loading__bulb" />
          <span className="christmas-loading__bulb" />
        </div>

        <p className="christmas-loading__eyebrow">{eyebrow}</p>
        {mode === 'session' ? (
          <h1 className="christmas-loading__title">{title}</h1>
        ) : (
          <h2 className="christmas-loading__title">{title}</h2>
        )}

        <div className="christmas-loading__frame-bevel">
          <span
            className="christmas-loading__corner christmas-loading__corner--tl"
            aria-hidden="true"
          />
          <span
            className="christmas-loading__corner christmas-loading__corner--tr"
            aria-hidden="true"
          />
          <span
            className="christmas-loading__corner christmas-loading__corner--bl"
            aria-hidden="true"
          />
          <span
            className="christmas-loading__corner christmas-loading__corner--br"
            aria-hidden="true"
          />
          <div
            className="christmas-loading__mat"
            style={photo ? { aspectRatio: photo.aspectRatio } : undefined}
          >
            {canShowThumbPreview && photo ? (
              <img
                className="christmas-loading__photo"
                src={photo.variants.thumb}
                alt=""
                decoding="async"
                width={photo.variantMetrics?.thumb?.width ?? photo.width}
                height={photo.variantMetrics?.thumb?.height ?? photo.height}
              />
            ) : (
              <div className="christmas-loading__crest" aria-hidden="true">
                <span className="christmas-loading__crest-halo" />
                <span className="christmas-loading__crest-star">✦</span>
                <span className="christmas-loading__crest-caption">
                  {definition?.displayName ?? 'Natal em Família'}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="christmas-loading__phase" data-testid="game-loading-phase">
          {phaseMessage}
        </p>

        {displayPercent !== undefined ? (
          <div
            className="christmas-loading__progress"
            role="progressbar"
            aria-label="Progresso do carregamento"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={displayPercent}
            data-testid="game-loading-progress"
          >
            <div className="christmas-loading__progress-track">
              <div
                className="christmas-loading__progress-fill"
                style={{ transform: `scaleX(${displayPercent / 100})` }}
              />
            </div>
            <span className="christmas-loading__progress-label">{displayPercent}%</span>
          </div>
        ) : (
          <div className="christmas-loading__divider" aria-hidden="true" />
        )}

        <div
          className="christmas-loading__constellation"
          role="group"
          aria-label="Estrelas natalinas interativas"
        >
          {([0, 1, 2] as const).map((starIndex) => {
            const isLit = litStars[starIndex];
            const activeBursts = bursts.filter((b) => b.starIndex === starIndex);
            return (
              <button
                key={starIndex}
                type="button"
                className="christmas-loading__star-btn"
                data-lit={isLit ? 'true' : 'false'}
                data-testid={`loading-star-${starIndex}`}
                aria-label={STAR_LABELS[starIndex]}
                aria-pressed={isLit}
                onClick={() => handleStarClick(starIndex)}
              >
                <span className="christmas-loading__star-glyph" aria-hidden="true">
                  ✦
                </span>
                {activeBursts.map((burst) => (
                  <span
                    key={burst.id}
                    className="christmas-loading__star-burst"
                    data-testid="loading-star-burst"
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                ))}
              </button>
            );
          })}
        </div>
        <p className="christmas-loading__hint">Toque nas estrelas para espalhar brilho de Natal</p>
      </div>
    </div>
  );
}
