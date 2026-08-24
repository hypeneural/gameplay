import type { GameDefinition } from '@christmas-games/platform';
import type { ReactNode } from 'react';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { GameErrorState } from './GameErrorState.js';
import { LoadingState } from './LoadingState.js';

type GameScreenStatus = 'loading' | 'ready' | 'error';

const eventLabels: Record<string, string> = {
  NONE: 'Preparando jogo',
  GAME_READY: 'Pronto para brincar',
  GAME_STARTED: 'Brincadeira iniciada',
  GAME_PAUSED: 'Jogo em pausa',
  GAME_RESUMED: 'Brincadeira retomada',
  GAME_COMPLETED: 'Foto montada!',
  GAME_ASSET_FAILED: 'Não foi possível abrir a foto',
  GAME_EXITED: 'Até breve!',
};

function playerEventLabel(event: string): string {
  return eventLabels[event] ?? 'Atualizando jogo…';
}

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
          <span data-testid="game-event">{playerEventLabel(lastEvent)}</span>
        </div>
        <button
          className="button secondary game-exit"
          type="button"
          onClick={() => {
            playInterfaceTap();
            onExit();
          }}
        >
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
