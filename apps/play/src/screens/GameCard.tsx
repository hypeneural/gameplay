import type { GameDefinition, Photo } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { GamePreview } from './GamePreview.js';
import { ShellIcon } from '../components/ShellIcon.js';

interface GameCardProps {
  available: boolean;
  definition: GameDefinition;
  photo: Photo;
  onOpen(gameId: string): void;
  onPrefetch(gameId: string): void;
}

const shortNames: Record<string, string> = {
  'puzzle-swap': 'Quebra-cabeça',
  memory: 'Memórias de Natal',
  'guirlanda-das-lembrancas': 'Guirlanda das Lembranças',
};

/** A single activation target; preview photographs use thumbnails only. */
export function GameCard({
  available,
  definition,
  photo,
  onOpen,
  onPrefetch,
}: GameCardProps): React.JSX.Element {
  return (
    <article className={`game-card game-card--${definition.id}`}>
      <button
        className="game-card-button"
        type="button"
        data-testid={`open-game-${definition.id}`}
        disabled={!available}
        aria-label={
          available
            ? `Abrir ${definition.displayName}`
            : `${definition.displayName}: precisa de ${definition.minPhotos} fotos`
        }
        onClick={() => {
          if (!available) return;
          playInterfaceTap('open');
          onOpen(definition.id);
        }}
        onFocus={() => {
          if (available) onPrefetch(definition.id);
        }}
        onPointerDown={() => {
          if (available) onPrefetch(definition.id);
        }}
      >
        <GamePreview definition={definition} photo={photo} />
        <span className="game-card-copy">
          <span className="game-card-title">
            {shortNames[definition.id] ?? definition.displayName}
          </span>
          <span className="game-card-cta">
            {available ? 'Vamos jogar' : `${definition.minPhotos} fotos para brincar`}
            <ShellIcon name={available ? 'play' : 'heart'} />
          </span>
        </span>
      </button>
    </article>
  );
}
