import type { GameDefinition } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';

interface GameCardProps {
  available: boolean;
  definition: GameDefinition;
  onOpen(gameId: string): void;
  onPrefetch(gameId: string): void;
}

/** Product metadata drives cards; a card never loads a photo-game derivative. */
export function GameCard({
  available,
  definition,
  onOpen,
  onPrefetch,
}: GameCardProps): React.JSX.Element {
  return (
    <article className="game-card">
      <div aria-label={definition.cover.alt} className="game-card-preview" role="img" />
      <div className="game-card-copy">
        <h2>{definition.displayName}</h2>
        <p>{definition.shortDescription}</p>
        <button
          className="button game-card-cta"
          data-testid={`open-game-${definition.id}`}
          disabled={!available}
          type="button"
          onClick={() => {
            if (!available) return;
            playInterfaceTap();
            onOpen(definition.id);
          }}
          onFocus={() => {
            if (available) onPrefetch(definition.id);
          }}
          onPointerDown={() => {
            if (available) onPrefetch(definition.id);
          }}
        >
          {available ? 'Ver jogo' : `Precisa de ${definition.minPhotos} fotos`}
        </button>
      </div>
    </article>
  );
}
