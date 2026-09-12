import type { GameDefinition } from '@christmas-games/platform';
import { useEffect, useState, type ReactNode } from 'react';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { CompletionActions } from '../components/CompletionActions.js';
import { ShareButton } from '../components/ShareButton.js';
import { GameErrorState } from './GameErrorState.js';
import { LoadingState } from './LoadingState.js';
import { ShellIcon } from '../components/ShellIcon.js';
import { useShellInteractions } from '../experience/useShellInteractions.js';

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
  calm?: boolean;
  challengeLabel?: string;
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
  calm = false,
  children,
  challengeLabel,
  definition,
  eventSequence,
  lastEvent,
  onBrowseGames,
  onChallenge,
  onExit,
  onRetry,
  status,
}: GameScreenProps): React.JSX.Element {
  const interactions = useShellInteractions();
  const [completionActionsVisible, setCompletionActionsVisible] = useState(false);
  const memoryCompletion = definition.id === 'memory';
  const rudolphCompletion = definition.id === 'rena-das-lembrancas';
  const celebrationCompletion =
    memoryCompletion || definition.id === 'mosaico-em-queda' || rudolphCompletion;
  const magicPhoto = definition.id === 'magic-photo';
  const immersivePhotoGame =
    definition.id === 'guirlanda-das-lembrancas' ||
    definition.id === 'rena-das-lembrancas' ||
    magicPhoto;
  // Trinca owns its finale in the same physical mural as the board. The
  // generic sheet is useful for the other games, but would cover the winning
  // photo, garland and in-scene return action here.
  const completionIsOwnedByGame = definition.id === 'tic-tac-toe';

  useEffect(() => {
    if (status !== 'ready' || lastEvent !== 'GAME_COMPLETED' || completionIsOwnedByGame) {
      setCompletionActionsVisible(false);
      return;
    }
    // A last steering tap must not become a replay tap as the final album arrives.
    // This brief input guard also applies with reduced motion; it adds no animation.
    if (
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !rudolphCompletion) ||
      !celebrationCompletion
    ) {
      setCompletionActionsVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setCompletionActionsVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, [celebrationCompletion, completionIsOwnedByGame, lastEvent, rudolphCompletion, status]);

  return (
    <main
      ref={interactions}
      data-calm={calm}
      className={`game-screen crystal-game-shell${immersivePhotoGame ? ' game-screen--garland' : ''}${magicPhoto ? ' game-screen--magic-photo' : ''}${definition.id === 'rena-das-lembrancas' ? ' game-screen--rudolph' : ''}`}
      aria-label={`${definition.displayName} em execução`}
    >
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
          className="button secondary game-exit crystal-control"
          type="button"
          aria-label="Sair do jogo"
          onClick={() => {
            playInterfaceTap('back');
            onExit();
          }}
        >
          <ShellIcon name={immersivePhotoGame ? 'close' : 'back'} />
          <span className="game-exit-label">Sair do jogo</span>
        </button>
        {immersivePhotoGame ? null : <ShareButton className="game-share" />}
      </header>
      <section className="game-stage" aria-label="Área do jogo">
        {children}
        {status === 'loading' ? <LoadingState definition={definition} /> : null}
        {status === 'error' ? <GameErrorState onBack={onExit} onRetry={onRetry} /> : null}
        {status === 'ready' &&
        lastEvent === 'GAME_COMPLETED' &&
        !completionIsOwnedByGame &&
        completionActionsVisible ? (
          <CompletionActions
            {...(magicPhoto
              ? { variant: 'magic-photo' as const, question: 'Você encontrou a Magia do Natal!' }
              : immersivePhotoGame
                ? {
                    variant: 'garland' as const,
                    question:
                      definition.id === 'rena-das-lembrancas'
                        ? 'Seu Álbum de Natal está completo!'
                        : 'Suas lembranças, iluminadas',
                  }
                : {})}
            {...(memoryCompletion
              ? { eyebrow: 'ÁLBUM COMPLETO!', question: 'Quer brincar mais um pouco?' }
              : {})}
            onBrowseGames={onBrowseGames}
            onReplay={onRetry}
            {...(onChallenge ? { onChallenge } : {})}
            {...(challengeLabel ? { challengeLabel } : {})}
          />
        ) : null}
      </section>
    </main>
  );
}
