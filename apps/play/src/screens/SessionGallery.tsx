import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Session } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { GalleryAtmosphere } from '../components/GalleryAtmosphere.js';
import { GalleryMagicButton } from '../components/GalleryMagicButton.js';
import { GalleryFrame } from '../components/GalleryFrame.js';
import { ShellIcon } from '../components/ShellIcon.js';
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
  soundEnabled: boolean;
  onToggleSound(): void;
  initialVisibleCount?: number;
  restoreScrollY?: number;
  onVisibleCountChange?(count: number): void;
  onSelectPhoto(photoId: string): void;
  onBack(): void;
  onPlayPhoto(photoId: string): void;
}

export function SessionGallery({
  session,
  selectedPhotoId,
  calm,
  lowQuality,
  soundEnabled,
  onToggleSound,
  initialVisibleCount,
  restoreScrollY = 0,
  onVisibleCountChange,
  onSelectPhoto,
  onBack,
  onPlayPhoto,
}: SessionGalleryProps): React.JSX.Element {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(
      session.photos.length,
      Math.max(GALLERY_INITIAL_PHOTO_COUNT, initialVisibleCount ?? GALLERY_INITIAL_PHOTO_COUNT),
    ),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number>();
  const [shareStatus, setShareStatus] = useState('');
  const [magicPulse, setMagicPulse] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Restore after Suspense has mounted the actual cards, avoiding fallback clamping.
  // Known aspect ratios reserve space before image decoding completes.
  useLayoutEffect(() => {
    if (restoreScrollY > 0) window.scrollTo(0, restoreScrollY);
  }, [restoreScrollY, session.id]);

  useEffect(() => {
    // initialVisibleCount is a mount-only seed. The parent updates that seed as
    // batches expand, but it must never reset an already-open photo lightbox.
    setVisibleCount((current) => Math.min(current, session.photos.length));
    setLightboxIndex(undefined);
  }, [session.id, session.photos.length]);

  useEffect(() => {
    onVisibleCountChange?.(visibleCount);
  }, [visibleCount, onVisibleCountChange]);

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
      <GalleryAtmosphere
        active={!calm && !lowQuality && lightboxIndex === undefined}
        magicPulse={magicPulse}
      />
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
          <ShellIcon name="back" />
        </button>
        <span className="gallery-topbar-label">Suas fotos</span>
        <button
          className="gallery-icon-button"
          type="button"
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Desligar som' : 'Ligar som'}
          onClick={onToggleSound}
        >
          <ShellIcon name={soundEnabled ? 'volume' : 'muted'} />
        </button>
        <button
          className="gallery-icon-button"
          type="button"
          aria-label="Compartilhar álbum"
          onClick={() => void share()}
        >
          <ShellIcon name="share" />
        </button>
      </header>

      <section
        className="gallery-hero"
        data-magic-pulse={magicPulse}
        aria-labelledby="gallery-hero-title"
      >
        <div className="gallery-hero-glow" aria-hidden="true" />
        <div className="gallery-hero-garland" aria-hidden="true" />
        <GalleryMagicButton active={!calm && !lowQuality} onCelebrate={setMagicPulse} />
        <div className="gallery-hero-content">
          <h1 id="gallery-hero-title">Seu Álbum de Natal</h1>
          <span className="gallery-hero-flourish" aria-hidden="true">
            <svg viewBox="0 0 180 22" focusable="false">
              <path
                d="M12 12c22 0 34-6 52-6 10 0 14 4 26 4s16-4 26-4c18 0 30 6 52 6"
                fill="none"
                stroke="#eec97f"
                strokeWidth="1.3"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M90 2l3.2 5.5h-2l2.6 4.5h-2.2l2.8 4.8H85.6l2.8-4.8h-2.2l2.6-4.5h-2L90 2Z"
                fill="#ffe5a3"
              />
              <circle cx="52" cy="11" r="1.6" fill="#ffd98a" />
              <circle cx="128" cy="11" r="1.6" fill="#ffd98a" />
            </svg>
          </span>
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
            data-orientation={photo.orientation}
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
            <GalleryFrame
              sessionKey={session.id}
              photo={photo}
              variant="card"
              index={index}
              eager={index === 0}
              sizes={GALLERY_FEED_SIZES}
              srcSetVariants={GALLERY_FEED_VARIANTS}
            />
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

      {!stillHasPhotos ? (
        <footer className="gallery-finale">
          <p className="gallery-finale-kicker">UM NATAL QUE FICA PARA SEMPRE</p>
          <h2>As lembranças continuam</h2>
          <p>Reviva seus momentos e transforme suas fotografias em brincadeiras de Natal.</p>
          <button
            className="gallery-play-photo gallery-return-games"
            type="button"
            onClick={() => {
              playInterfaceTap('back');
              onBack();
            }}
          >
            Voltar aos jogos de Natal <span aria-hidden="true">→</span>
          </button>
          <p className="gallery-finale-signature">Com carinho, Estúdio Evydência</p>
        </footer>
      ) : null}

      <footer className="gallery-brand-dock" data-testid="gallery-brand-dock">
        <span
          className="gallery-footer-photo-count"
          aria-label={`${session.photos.length} fotos no álbum`}
        >
          <ShellIcon name="photos" /> {session.photos.length} fotos
        </span>
        <a
          className="gallery-brand-link"
          href="https://fotosdenatal.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Conheça o Natal do Estúdio Evydência em fotosdenatal.com (abre em nova aba)"
          onClick={() => playInterfaceTap('open')}
        >
          <span className="gallery-brand-heart" aria-hidden="true">
            <ShellIcon name="heart" />
          </span>
          <span className="gallery-brand-signature">
            <small>FEITO COM CARINHO</small>
            <strong>por EVYDÊNCIA</strong>
          </span>
          <span className="gallery-brand-destination">
            <small>CONHEÇA NOSSO NATAL</small>
            <strong>fotosdenatal.com</strong>
          </span>
          <ShellIcon name="next" />
        </a>
      </footer>

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
            sessionKey={session.id}
            lowQuality={lowQuality}
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
