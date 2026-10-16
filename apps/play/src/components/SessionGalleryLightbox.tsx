import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { PhotoPrint } from './PhotoPrint.js';
import { ShellIcon } from './ShellIcon.js';
import { GALLERY_LIGHTBOX_SIZES, GALLERY_LIGHTBOX_VARIANTS } from '../gallery/galleryPolicy.js';

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
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | undefined>(undefined);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | undefined>(undefined);
  const pinchStartDistRef = useRef<number | undefined>(undefined);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const photo = photos[index];

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    setZoomed(false);
    stageRef.current?.scrollTo(0, 0);
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

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>): void => {
    if (event.touches.length === 2) {
      const t0 = event.touches[0]!;
      const t1 = event.touches[1]!;
      pinchStartDistRef.current = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      return;
    }
    if (event.touches.length === 1) {
      const touch = event.touches[0]!;
      const now = performance.now();
      const lastTap = lastTapRef.current;

      // Double-tap detection (< 300ms, < 28px displacement)
      if (
        lastTap &&
        now - lastTap.time < 300 &&
        Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 28
      ) {
        lastTapRef.current = undefined;
        playInterfaceTap('toggle');
        setZoomed((z) => !z);
        return;
      }

      lastTapRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      if (!zoomed) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      }
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>): void => {
    if (event.touches.length === 2 && pinchStartDistRef.current !== undefined) {
      const t0 = event.touches[0]!;
      const t1 = event.touches[1]!;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const ratio = dist / pinchStartDistRef.current;
      if (!zoomed && ratio > 1.25) {
        playInterfaceTap('toggle');
        setZoomed(true);
        pinchStartDistRef.current = dist;
      } else if (zoomed && ratio < 0.8) {
        playInterfaceTap('toggle');
        setZoomed(false);
        pinchStartDistRef.current = dist;
      }
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>): void => {
    if (event.touches.length < 2) {
      pinchStartDistRef.current = undefined;
    }
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
          <ShellIcon name="close" />
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
          <ShellIcon name={zoomed ? 'zoom-out' : 'zoom-in'} />
        </button>
      </header>

      <div
        ref={stageRef}
        className="gallery-lightbox-stage"
        data-zoomed={zoomed}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          <ShellIcon name="back" />
        </button>
        <button
          className="gallery-play-photo"
          type="button"
          onClick={() => {
            playInterfaceTap('open');
            onPlayPhoto(photo.id);
          }}
        >
          <ShellIcon name="gamepad" />
          <span className="gallery-play-photo-copy">
            <strong>Jogar com esta foto</strong>
            <small>Escolher o jogo no painel</small>
          </span>
          <ShellIcon name="next" />
        </button>
        <button
          className="gallery-lightbox-arrow"
          type="button"
          aria-label="Próxima foto"
          disabled={photos.length < 2}
          onClick={() => move(1)}
        >
          <ShellIcon name="next" />
        </button>
      </footer>
    </dialog>
  );
}
