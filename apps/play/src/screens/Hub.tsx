import { useEffect, useRef, useState } from 'react';
import type { GameDefinition, Session } from '@christmas-games/platform';
import { GameCard } from './GameCard.js';

interface HubProps {
  session: Session;
  fixtureCount: 4 | 12 | 120 | 172;
  games: readonly GameDefinition[];
  onFixtureChange(count: 4 | 12 | 120 | 172): void;
  onOpenGame(gameId: string): void;
  onPrefetchGame(gameId: string): void;
  onSelectPhoto(photoId: string): void;
  selectedPhotoId: string;
}

const photoChunkSize = 12;

export function Hub({
  session,
  fixtureCount,
  games,
  onFixtureChange,
  onOpenGame,
  onPrefetchGame,
  onSelectPhoto,
  selectedPhotoId,
}: HubProps): React.JSX.Element {
  const [visiblePhotos, setVisiblePhotos] = useState(photoChunkSize);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const renderedPhotos = session.photos.slice(0, visiblePhotos);
  const hasMorePhotos = renderedPhotos.length < session.photos.length;
  const loadMorePhotos = (): void => {
    setVisiblePhotos((current) => Math.min(current + photoChunkSize, session.photos.length));
  };

  useEffect(() => {
    setVisiblePhotos(photoChunkSize);
  }, [session.id]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMorePhotos || typeof window.IntersectionObserver !== 'function') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMorePhotos();
        }
      },
      { rootMargin: '160px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMorePhotos, renderedPhotos.length, session.photos.length]);

  return (
    <main className="shell">
      <p className="eyebrow">FOTOS DE NATAL</p>
      <h1>{session.displayName}</h1>
      <p className="intro">
        Escolha uma foto e abra a prova vertical do jogo. As fotos são sempre proporcionais.
      </p>
      <label className="field">
        Fixture de sessão
        <select
          value={fixtureCount}
          onChange={(event) => onFixtureChange(Number(event.target.value) as 4 | 12 | 120 | 172)}
        >
          <option value={4}>4 fotos</option>
          <option value={12}>12 fotos mistas</option>
          <option value={120}>120 fotos mistas</option>
          <option value={172}>172 fotos mistas</option>
        </select>
      </label>
      <div className="photo-grid" aria-label="Fotos da sessão">
        {renderedPhotos.map((photo) => (
          <button
            aria-pressed={photo.id === selectedPhotoId}
            className={`photo-card ${photo.orientation}`}
            data-testid={`photo-${photo.id}`}
            key={photo.id}
            type="button"
            onClick={() => onSelectPhoto(photo.id)}
          >
            <img
              alt={`Foto de teste ${photo.id}`}
              decoding="async"
              height={photo.height}
              loading="lazy"
              src={photo.variants.thumb}
              width={photo.width}
            />
            <span>{photo.orientation}</span>
          </button>
        ))}
      </div>
      {hasMorePhotos ? (
        <div className="photo-sentinel" data-testid="photo-sentinel" ref={sentinelRef}>
          <p className="hint">
            Mostrando {renderedPhotos.length} thumbnails de {session.photos.length}; versões game
            não foram carregadas.
          </p>
          <button
            className="button secondary"
            data-testid="load-more-photos"
            type="button"
            onClick={loadMorePhotos}
          >
            Carregar mais fotos
          </button>
        </div>
      ) : null}
      <section className="games-section" aria-labelledby="games-heading">
        <p className="eyebrow">JOGOS</p>
        <h2 id="games-heading">Escolha uma brincadeira</h2>
        <div className="game-card-list">
          {games.map((game) => (
            <GameCard
              definition={game}
              key={game.id}
              onOpen={onOpenGame}
              onPrefetch={onPrefetchGame}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
