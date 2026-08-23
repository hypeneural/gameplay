import type { GameDefinition } from '@christmas-games/platform';

interface GameCardProps {
  definition: GameDefinition;
  onOpen(gameId: string): void;
  onPrefetch(gameId: string): void;
}

/** Product metadata drives cards; a card never loads a photo-game derivative. */
export function GameCard({ definition, onOpen, onPrefetch }: GameCardProps): React.JSX.Element {
  return (
    <article className="game-card">
      <div aria-label={definition.cover.alt} className="game-card-preview" role="img">
        <span aria-hidden="true">✦</span>
        <span aria-hidden="true">🎄</span>
        <span aria-hidden="true">✦</span>
      </div>
      <div className="game-card-copy">
        <h2>{definition.displayName}</h2>
        <p>{definition.shortDescription}</p>
        <button
          className="button game-card-cta"
          data-testid={`open-game-${definition.id}`}
          type="button"
          onClick={() => onOpen(definition.id)}
          onFocus={() => onPrefetch(definition.id)}
          onPointerDown={() => onPrefetch(definition.id)}
        >
          Ver jogo
        </button>
      </div>
    </article>
  );
}
