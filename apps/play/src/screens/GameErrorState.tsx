import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { ShellIcon } from '../components/ShellIcon.js';

interface GameErrorStateProps {
  onBack(): void;
  onRetry(): void;
}

export function GameErrorState({ onBack, onRetry }: GameErrorStateProps): React.JSX.Element {
  return (
    <div className="game-error" role="alert">
      <p>Não foi possível abrir o jogo.</p>
      <div className="game-error-actions">
        <button
          className="button crystal-control crystal-control--ruby"
          type="button"
          onClick={() => {
            playInterfaceTap('start');
            onRetry();
          }}
        >
          <ShellIcon name="play" /> Tentar novamente
        </button>
        <button
          className="button secondary crystal-control"
          type="button"
          onClick={() => {
            playInterfaceTap('back');
            onBack();
          }}
        >
          <ShellIcon name="back" /> Voltar para a sessão
        </button>
      </div>
    </div>
  );
}
