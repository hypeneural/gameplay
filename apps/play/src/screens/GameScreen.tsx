import type { GameDefinition } from '@christmas-games/platform';
import type { ReactNode } from 'react';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { CompletionActions } from '../components/CompletionActions.js';
import { ShareButton } from '../components/ShareButton.js';
import { GameErrorState } from './GameErrorState.js';
import { LoadingState } from './LoadingState.js';

type GameScreenStatus = 'loading' | 'ready' | 'error';

const eventLabels: Record<string, string> = {
  NONE: 'Preparando jogo',
  GAME_READY: 'Pronto para brincar',
  GAME_STARTED: 'Brincadeira iniciada',
  GAME_INTERACTION_SETTLED: 'Brincadeira iniciada',
  GAME_PAUSED: 'Jogo em pausa',
  GAME_RESUMED: 'Brincadeira retomada',
  GAME_COMPLETED: 'Brincadeira concluída!',
  GAME_ASSET_FAILED: 'Não foi possível abrir a foto',
  GAME_EXITED: 'Até breve!',
};

function playerEventLabel(event: string): string {
  return eventLabels[event] ?? 'Atualizando jogo…';
}

interface GameScreenProps {
  children: ReactNode;
  definition: GameDefinition;
  eventSequence: number;
  lastEvent: string;
  onBrowseGames(): void;
  onChallenge?: () => void;
  onExit(): void;
  onRetry(): void;
  status: GameScreenStatus;
}

/**
 * React owns the route shell and accessible lifecycle announcements. Phaser owns
 * the visible in-run HUD, including the timer and puzzle progress, so the
 * player never sees the same information in two layers.
 */
export function GameScreen({
  children,
  definition,
  eventSequence,
  lastEvent,
  onBrowseGames,
  onChallenge,
  onExit,
  onRetry,
  status,
}: GameScreenProps): React.JSX.Element {
  return (
    <main className="game-screen" aria-label={`${definition.displayName} em execução`}>
      <header className="game-header">
        <div className="game-screen-events" aria-live="polite">
          <span data-testid="game-status">
            {status === 'ready' ? 'Pronto' : status === 'error' ? 'Erro' : 'Carregando…'}
          </span>
          <span data-event-sequence={eventSequence} data-testid="game-event">
            {playerEventLabel(lastEvent)}
          </span>
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
        <ShareButton className="game-share" />
      </header>
      <section className="game-stage" aria-label="Área do jogo">
        {children}
        {status === 'loading' ? <LoadingState definition={definition} /> : null}
        {status === 'error' ? <GameErrorState onBack={onExit} onRetry={onRetry} /> : null}
        {status === 'ready' && lastEvent === 'GAME_COMPLETED' ? (
          <CompletionActions
            onBrowseGames={onBrowseGames}
            onReplay={onRetry}
            {...(onChallenge ? { onChallenge } : {})}
          />
        ) : null}
      </section>
    </main>
  );
}
