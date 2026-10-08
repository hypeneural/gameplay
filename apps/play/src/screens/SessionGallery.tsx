import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { Session } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { PhotoPrint } from '../components/PhotoPrint.js';
import {
  GALLERY_AUTOLOAD_ROOT_MARGIN,
  GALLERY_FEED_SIZES,
  GALLERY_FEED_VARIANTS,
  GALLERY_INITIAL_PHOTO_COUNT,
  nextGalleryVisibleCount,
} from '../gallery/galleryPolicy.js';
import '../gallery.css';

const SessionGalleryLightbox = lazy(async () => ({
  default: (await import('../components/SessionGalleryLightbox.js')).SessionGalleryLightbox,
}));

interface SessionGalleryProps {
  session: Session;
  selectedPhotoId: string;
  calm: boolean;
  lowQuality: boolean;
  onSelectPhoto(photoId: string): void;
  onBack(): void;
  onPlayPhoto(photoId: string): void;
}

export function SessionGallery({
  session,
  selectedPhotoId,
  calm,
  lowQuality,
  onSelectPhoto,
  onBack,
  onPlayPhoto,
}: SessionGalleryProps): React.JSX.Element {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(GALLERY_INITIAL_PHOTO_COUNT, session.photos.length),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number>();
  const [shareStatus, setShareStatus] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(Math.min(GALLERY_INITIAL_PHOTO_COUNT, session.photos.length));
    setLightboxIndex(undefined);
  }, [session.id, session.photos.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((current) => nextGalleryVisibleCount(current, session.photos.length));
      },
      { rootMargin: GALLERY_AUTOLOAD_ROOT_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [session.id, session.photos.length]);

  const share = async (): Promise<void> => {
    playInterfaceTap('open');
    const data = { title: 'Meu Álbum de Natal', url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
        setShareStatus('Álbum compartilhado');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.url);
        setShareStatus('Link copiado');
        return;
      }
      setShareStatus('Use o menu do navegador para compartilhar');
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Não foi possível compartilhar agora');
    }
  };

  const visiblePhotos = session.photos.slice(0, visibleCount);
  const stillHasPhotos = visibleCount < session.photos.length;

  return (
    <main
      className="shell christmas-gallery-shell"
      data-calm={calm || lowQuality}
      data-testid="session-gallery"
    >
      <header className="gallery-topbar">
        <button
          className="gallery-icon-button"
          type="button"
          aria-label="Voltar para os jogos"
          onClick={() => {
            playInterfaceTap('back');
            onBack();
          }}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className="gallery-title-group">
          <p className="eyebrow">SEU NATAL EM FAMÍLIA</p>
          <h1>Álbum de Natal</h1>
        </div>
        <button
          className="gallery-icon-button"
          type="button"
          aria-label="Compartilhar álbum"
          onClick={() => void share()}
        >
          <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="gallery-intro" aria-labelledby="gallery-heading">
        <div className="gallery-pine gallery-pine--left" aria-hidden="true" />
        <div className="gallery-pine gallery-pine--right" aria-hidden="true" />
        <p id="gallery-heading">Toque em uma lembrança para ver de perto ou brincar com ela.</p>
        <div className="gallery-lights" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>

      {shareStatus ? (
        <p className="gallery-share-status" role="status">
          {shareStatus}
        </p>
      ) : null}

      <div className="gallery-grid" aria-label="Fotos do seu álbum de Natal">
        {visiblePhotos.map((photo, index) => (
          <button
            className="gallery-card"
            data-photo-id={photo.id}
            type="button"
            key={photo.id}
            aria-label={`Abrir foto ${index + 1} de ${session.photos.length}`}
            aria-current={photo.id === selectedPhotoId ? 'true' : undefined}
            onClick={() => {
              playInterfaceTap('photo');
              onSelectPhoto(photo.id);
              setLightboxIndex(index);
            }}
          >
            <span className="gallery-photo-frame" style={{ aspectRatio: photo.aspectRatio }}>
              <PhotoPrint
                photo={photo}
                variant="card"
                eager={index === 0}
                sizes={GALLERY_FEED_SIZES}
                srcSetVariants={GALLERY_FEED_VARIANTS}
                alt={`Lembrança de Natal ${index + 1}`}
              />
            </span>
            <span className="gallery-card-mark" aria-hidden="true">
              ✦
            </span>
          </button>
        ))}
      </div>

      <div className="gallery-sentinel" ref={sentinelRef} data-testid="gallery-sentinel">
        <p>
          {Math.min(visibleCount, session.photos.length)} de {session.photos.length} lembranças
        </p>
        {stillHasPhotos ? (
          <button
            className="gallery-more-button"
            type="button"
            onClick={() => {
              playInterfaceTap('open');
              setVisibleCount((current) => nextGalleryVisibleCount(current, session.photos.length));
            }}
          >
            Ver mais lembranças
          </button>
        ) : (
          <span className="gallery-end-mark" aria-hidden="true">
            ✦ ❄ ✦
          </span>
        )}
      </div>

      {typeof lightboxIndex === 'number' ? (
        <Suspense
          fallback={
            <div className="gallery-lightbox-loading" role="status">
              Preparando lembrança…
            </div>
          }
        >
          <SessionGalleryLightbox
            photos={session.photos}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onSelectPhoto={onSelectPhoto}
            onClose={() => setLightboxIndex(undefined)}
            onPlayPhoto={onPlayPhoto}
          />
        </Suspense>
      ) : null}
    </main>
  );
}
