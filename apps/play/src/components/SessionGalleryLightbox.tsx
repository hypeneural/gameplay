import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { PhotoPrint } from './PhotoPrint.js';
import {
  GALLERY_LIGHTBOX_SIZES,
  GALLERY_LIGHTBOX_VARIANTS,
} from '../gallery/galleryPolicy.js';

interface SessionGalleryLightboxProps {
  photos: readonly Photo[];
  index: number;
  onIndexChange(index: number): void;
  onSelectPhoto(photoId: string): void;
  onClose(): void;
  onPlayPhoto(photoId: string): void;
}

export function SessionGalleryLightbox({
  photos,
  index,
  onIndexChange,
  onSelectPhoto,
  onClose,
  onPlayPhoto,
}: SessionGalleryLightboxProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartRef = useRef<{ x: number; y: number }>();
  const [zoomed, setZoomed] = useState(false);
  const photo = photos[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  if (!photo) return <></>;

  const move = (offset: number): void => {
    if (photos.length < 2) return;
    const nextIndex = (index + offset + photos.length) % photos.length;
    const next = photos[nextIndex];
    if (!next) return;
    playInterfaceTap('photo');
    onSelectPhoto(next.id);
    onIndexChange(nextIndex);
  };

  return (
    <dialog
      ref={dialogRef}
      className="gallery-lightbox"
      aria-label={`Foto ${index + 1} de ${photos.length}`}
      onCancel={(event) => {
        event.preventDefault();
        playInterfaceTap('back');
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <header className="gallery-lightbox-header">
        <button
          className="gallery-icon-button"
          type="button"
          aria-label="Fechar foto"
          onClick={() => {
            playInterfaceTap('back');
            onClose();
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
        <span aria-live="polite">
          {index + 1} de {photos.length}
        </span>
        <button
          className="gallery-icon-button"
          type="button"
          aria-pressed={zoomed}
          aria-label={zoomed ? 'Ajustar foto à tela' : 'Ampliar foto'}
          onClick={() => {
            playInterfaceTap('toggle');
            setZoomed((value) => !value);
          }}
        >
          <span aria-hidden="true">{zoomed ? '−' : '+'}</span>
        </button>
      </header>

      <div
        className="gallery-lightbox-stage"
        data-zoomed={zoomed}
        onTouchStart={(event) => {
          if (zoomed) return;
          const touch = event.touches[0];
          if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          if (zoomed) return;
          const start = touchStartRef.current;
          touchStartRef.current = undefined;
          const touch = event.changedTouches[0];
          if (!start || !touch) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.35) {
            move(dx < 0 ? 1 : -1);
          }
        }}
      >
        <PhotoPrint
          key={photo.id}
          photo={photo}
          variant="game"
          eager
          sizes={GALLERY_LIGHTBOX_SIZES}
          srcSetVariants={GALLERY_LIGHTBOX_VARIANTS}
          alt={`Lembrança de Natal ${index + 1}`}
        />
      </div>

      <footer className="gallery-lightbox-footer">
        <button
          className="gallery-lightbox-arrow"
          type="button"
          aria-label="Foto anterior"
          disabled={photos.length < 2}
          onClick={() => move(-1)}
        >
          ‹
        </button>
        <button
          className="gallery-play-photo"
          type="button"
          onClick={() => {
            playInterfaceTap('open');
            onPlayPhoto(photo.id);
          }}
        >
          <span aria-hidden="true">✦</span>
          Jogar com esta foto
        </button>
        <button
          className="gallery-lightbox-arrow"
          type="button"
          aria-label="Próxima foto"
          disabled={photos.length < 2}
          onClick={() => move(1)}
        >
          ›
        </button>
      </footer>
    </dialog>
  );
}
