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
  showFixtureSelector: boolean;
}

const photoChunkSize = 12;

function photoOrientationLabel(orientation: string): string {
  return orientation === 'landscape' ? 'Horizontal' : 'Vertical';
}

export function Hub({
  session,
  fixtureCount,
  games,
  onFixtureChange,
  onOpenGame,
  onPrefetchGame,
  onSelectPhoto,
  selectedPhotoId,
  showFixtureSelector,
}: HubProps): React.JSX.Element {
  const [visiblePhotos, setVisiblePhotos] = useState(photoChunkSize);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const renderedPhotos = session.photos.slice(0, visiblePhotos);
  const hasMorePhotos = renderedPhotos.length < session.photos.length;
  const selectedPhoto =
    session.photos.find((photo) => photo.id === selectedPhotoId) ?? session.photos[0]!;
  const primaryGame = games.find((game) => game.id === 'puzzle-swap') ?? games[0];
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
      {showFixtureSelector ? (
        <label className="field">
          Amostra da sessão
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
      ) : (
        <p className="hint">Modo privado de teste: somente derivados otimizados são carregados.</p>
      )}
      <div className="photo-grid" aria-label="Fotos da sessão">
        {renderedPhotos.map((photo) => (
          <button
            aria-pressed={photo.id === selectedPhotoId}
            className={`photo-card ${photo.orientation}`}
            data-testid={`photo-${photo.id}`}
            key={photo.id}
            type="button"
            onClick={() => {
              onSelectPhoto(photo.id);
              setSelectionVersion((current) => current + 1);
              if (primaryGame) onPrefetchGame(primaryGame.id);
            }}
          >
            <img
              alt={`Foto ${photoOrientationLabel(photo.orientation).toLowerCase()} da sessão`}
              decoding="async"
              height={photo.height}
              loading="lazy"
              src={photo.variants.thumb}
              width={photo.width}
            />
            <span>{photoOrientationLabel(photo.orientation)}</span>
          </button>
        ))}
      </div>
      {primaryGame ? (
        <section
          aria-label="Foto escolhida"
          className="photo-selection"
          data-testid="photo-selection"
          key={`${selectedPhoto.id}-${selectionVersion}`}
        >
          <div aria-hidden="true" className="photo-selection-sparkles">
            ✦ ✧
          </div>
          <div>
            <p className="eyebrow">FOTO SELECIONADA</p>
            <h2>Pronta para brincar</h2>
            <p className="photo-selection-meta">
              Foto {selectedPhoto.orientation === 'portrait' ? 'vertical' : 'horizontal'} · sem
              distorção
            </p>
          </div>
          <button
            className="button primary-game-cta"
            data-testid="start-selected-photo"
            type="button"
            onClick={() => onOpenGame(primaryGame.id)}
            onFocus={() => onPrefetchGame(primaryGame.id)}
            onPointerDown={() => onPrefetchGame(primaryGame.id)}
          >
            Jogar agora <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : null}
      {hasMorePhotos ? (
        <div className="photo-sentinel" data-testid="photo-sentinel" ref={sentinelRef}>
          <p className="hint">
            Mostrando {renderedPhotos.length} miniaturas de {session.photos.length}; as versões para
            jogar ainda não foram carregadas.
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
