import { useEffect, useRef } from 'react';
import { ShareButton } from './ShareButton.js';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { ShellIcon } from './ShellIcon.js';

interface CompletionActionsProps {
  readonly challengeLabel?: string;
  readonly eyebrow?: string;
  readonly question?: string;
  readonly variant?: 'default' | 'garland' | 'magic-photo';
  onBrowseGames(): void;
  onChallenge?: () => void;
  onReplay(): void;
}

/** The shell owns post-win navigation; the canvas keeps the photo celebration. */
export function CompletionActions({
  challengeLabel = 'Mais desafio',
  eyebrow = 'FOTO MONTADA!',
  onBrowseGames,
  onChallenge,
  onReplay,
  question = 'O que você quer fazer agora?',
  variant = 'default',
}: CompletionActionsProps): React.JSX.Element {
  const replayRef = useRef<HTMLButtonElement>(null);
  const isGarland = variant === 'garland';
  const isMagic = variant === 'magic-photo';

  useEffect(() => {
    if (isGarland) replayRef.current?.focus({ preventScroll: true });
  }, [isGarland]);

  const act = (action: () => void): void => {
    playInterfaceTap();
    action();
  };

  return (
    <section
      aria-labelledby="completion-actions-title"
      className={`completion-actions${isGarland ? ' completion-actions--garland' : ''}${isMagic ? ' completion-actions--magic-photo' : ''}`}
    >
      {isGarland || isMagic ? null : <p className="eyebrow">{eyebrow}</p>}
      <h2 id="completion-actions-title">{question}</h2>
      <div className="completion-action-grid">
        <button
          ref={replayRef}
          className="button completion-replay crystal-control crystal-control--ruby"
          type="button"
          onClick={() => act(onReplay)}
        >
          <ShellIcon name="play" /> Brincar de novo
        </button>
        {onChallenge ? (
          <button
            className="button secondary completion-challenge crystal-control"
            type="button"
            onClick={() => act(onChallenge)}
          >
            <ShellIcon name="magic" /> {challengeLabel}
          </button>
        ) : null}
        <button
          className="button secondary completion-catalog crystal-control"
          type="button"
          onClick={() => act(onBrowseGames)}
        >
          <ShellIcon name="back" /> {isGarland || isMagic ? 'Outros jogos' : 'Ver outros jogos'}
        </button>
        {isMagic ? null : <ShareButton className="completion-share" />}
      </div>
    </section>
  );
}
