import { useMemo, useState } from 'react';
import { createChristmasEffects } from '@christmas-games/theme';
import type {
  FeedbackCue,
  FeedbackInstruction,
  MotionPreference,
  QualityProfile,
} from '@christmas-games/theme';
import { useExperienceSettings, type ExperiencePhotoShape } from '../app/ExperienceSettings.js';

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
    </main>
  );
}
