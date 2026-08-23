import type { GameDefinition } from '@christmas-games/platform';
import type { ReactNode } from 'react';
import { GameErrorState } from './GameErrorState.js';
import { LoadingState } from './LoadingState.js';

type GameScreenStatus = 'loading' | 'ready' | 'error';

interface GameScreenProps {
  children: ReactNode;
  definition: GameDefinition;
  lastEvent: string;
  onExit(): void;
  onRetry(): void;
  status: GameScreenStatus;
}

/** React owns the semantic chrome; its direct Phaser parent has no padding or border. */
export function GameScreen({
  children,
  definition,
  lastEvent,
  onExit,
  onRetry,
  status,
}: GameScreenProps): React.JSX.Element {
  return (
    <main className="game-screen" aria-label={`${definition.displayName} em execução`}>
      <header className="game-header">
        <div>
          <p className="eyebrow">JOGO DE NATAL</p>
          <strong>{definition.displayName}</strong>
        </div>
        <div className="game-status" aria-live="polite">
          <span data-testid="game-status">
            {status === 'ready' ? 'Pronto' : status === 'error' ? 'Erro' : 'Carregando…'}
          </span>
          <span data-testid="game-event">{lastEvent}</span>
        </div>
        <button className="button secondary game-exit" type="button" onClick={onExit}>
          Sair do jogo
        </button>
      </header>
      <section className="game-stage" aria-label="Área do jogo">
        {children}
        {status === 'loading' ? <LoadingState definition={definition} /> : null}
        {status === 'error' ? <GameErrorState onBack={onExit} onRetry={onRetry} /> : null}
      </section>
    </main>
  );
}
