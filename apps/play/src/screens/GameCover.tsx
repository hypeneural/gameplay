import type { GameDefinition, Photo } from '@christmas-games/platform';

interface GameCoverProps {
  definition: GameDefinition;
  photo: Photo;
  onBack(): void;
  onPlay(): void;
  onPrefetch(): void;
}

/** A React-owned cover keeps navigation and first instructions outside Phaser. */
export function GameCover({
  definition,
  photo,
  onBack,
  onPlay,
  onPrefetch,
}: GameCoverProps): React.JSX.Element {
  return (
    <main className="game-cover shell">
      <button className="button secondary cover-back" type="button" onClick={onBack}>
        Voltar para a sessão
      </button>
      <section className="game-cover-panel" aria-labelledby="game-cover-title">
        <div aria-label={definition.cover.alt} className="game-cover-preview" role="img">
          <span aria-hidden="true">✦</span>
          <span aria-hidden="true">🎄</span>
          <span aria-hidden="true">✦</span>
        </div>
        <p className="eyebrow">JOGO DE NATAL</p>
        <h1 id="game-cover-title">{definition.displayName}</h1>
        <p className="cover-rule">{definition.shortRule}</p>
        <p className="cover-photo-meta">Foto selecionada: {photo.orientation}</p>
        <button
          className="button cover-play"
          data-testid="play-selected-game"
          type="button"
          onClick={onPlay}
          onFocus={onPrefetch}
          onPointerDown={onPrefetch}
        >
          Jogar
        </button>
      </section>
    </main>
  );
}
