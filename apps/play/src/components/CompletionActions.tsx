import { ShareButton } from './ShareButton.js';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';

interface CompletionActionsProps {
  onBrowseGames(): void;
  onChallenge?: () => void;
  onReplay(): void;
}

/** The shell owns post-win navigation; the canvas keeps the photo celebration. */
export function CompletionActions({
  onBrowseGames,
  onChallenge,
  onReplay,
}: CompletionActionsProps): React.JSX.Element {
  const act = (action: () => void): void => {
    playInterfaceTap();
    action();
  };

  return (
    <section aria-labelledby="completion-actions-title" className="completion-actions">
      <p className="eyebrow">FOTO MONTADA!</p>
      <h2 id="completion-actions-title">O que você quer fazer agora?</h2>
      <div className="completion-action-grid">
        <button className="button completion-replay" type="button" onClick={() => act(onReplay)}>
          Brincar de novo
        </button>
        {onChallenge ? (
          <button
            className="button secondary completion-challenge"
            type="button"
            onClick={() => act(onChallenge)}
          >
            Mais desafio
          </button>
        ) : null}
        <button
          className="button secondary completion-catalog"
          type="button"
          onClick={() => act(onBrowseGames)}
        >
          Ver outros jogos
        </button>
        <ShareButton className="completion-share" />
      </div>
    </section>
  );
}
