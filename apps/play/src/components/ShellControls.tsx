import { ShellIcon } from './ShellIcon.js';

export interface ShellControlProps {
  soundEnabled: boolean;
  calm: boolean;
  animationsLocked?: boolean;
  onToggleSound(): void;
  onToggleCalm(): void;
}

export function ShellControls({
  soundEnabled,
  calm,
  animationsLocked = false,
  onToggleSound,
  onToggleCalm,
}: ShellControlProps): React.JSX.Element {
  return (
    <div className="shell-controls" aria-label="Preferências da brincadeira">
      <button
        className="shell-icon-button crystal-control"
        type="button"
        aria-label={soundEnabled ? 'Desligar som' : 'Ligar som'}
        aria-pressed={soundEnabled}
        onClick={onToggleSound}
      >
        <ShellIcon name={soundEnabled ? 'volume' : 'muted'} />
        <span>{soundEnabled ? 'Som' : 'Mudo'}</span>
      </button>
      <button
        className="shell-icon-button crystal-control"
        type="button"
        disabled={animationsLocked}
        aria-label={
          animationsLocked
            ? 'Animações reduzidas pelas preferências do aparelho'
            : calm
              ? 'Ativar animações'
              : 'Pausar animações'
        }
        aria-pressed={!calm && !animationsLocked}
        onClick={onToggleCalm}
      >
        <ShellIcon name={calm || animationsLocked ? 'calm' : 'magic'} />
        <span>{calm || animationsLocked ? 'Calmo' : 'Magia'}</span>
      </button>
    </div>
  );
}
