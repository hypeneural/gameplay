import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { GalleryFrame } from './GalleryFrame.js';
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
  const pinchStartRef = useRef<{ dist: number; scale: number } | undefined>(undefined);
  const panStartRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomed = zoomScale > 1.02;
  const photo = photos[index];

  const clampPan = (x: number, y: number, scale: number): { x: number; y: number } => {
    if (scale <= 1.02) return { x: 0, y: 0 };
    const stage = stageRef.current;
    const width = stage?.clientWidth ?? 360;
    const height = stage?.clientHeight ?? 520;
    const maxX = Math.max(0, ((scale - 1) * width) / 2);
    const maxY = Math.max(0, ((scale - 1) * height) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

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
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    stageRef.current?.scrollTo(0, 0);
  }, [index]);

  if (!photo) return <></>;

  const toggleZoom = (): void => {
    playInterfaceTap('toggle');
    if (zoomed) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomScale(2);
      setPanOffset({ x: 0, y: 0 });
    }
  };

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
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      if (dist > 8) {
        pinchStartRef.current = { dist, scale: zoomScale };
      }
      panStartRef.current = undefined;
      touchStartRef.current = undefined;
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
        panStartRef.current = undefined;
        touchStartRef.current = undefined;
        toggleZoom();
        return;
      }

      lastTapRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      if (zoomed) {
        panStartRef.current = {
          x: touch.clientX - panOffset.x,
          y: touch.clientY - panOffset.y,
        };
        touchStartRef.current = undefined;
      } else {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };
        panStartRef.current = undefined;
      }
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>): void => {
    if (event.touches.length === 2 && pinchStartRef.current !== undefined) {
      const t0 = event.touches[0]!;
      const t1 = event.touches[1]!;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const nextScale = Math.min(
        3,
        Math.max(1, (pinchStartRef.current.scale * dist) / pinchStartRef.current.dist),
      );
      if (
        (pinchStartRef.current.scale <= 1.02 && nextScale > 1.18) ||
        (pinchStartRef.current.scale > 1.02 && nextScale <= 1.02)
      ) {
        playInterfaceTap('toggle');
        pinchStartRef.current = { dist, scale: nextScale };
      }
      setZoomScale(nextScale);
      setPanOffset((prev) => clampPan(prev.x, prev.y, nextScale));
      return;
    }
    if (event.touches.length === 1 && zoomed && panStartRef.current !== undefined) {
      const touch = event.touches[0]!;
      const nextX = touch.clientX - panStartRef.current.x;
      const nextY = touch.clientY - panStartRef.current.y;
      setPanOffset(clampPan(nextX, nextY, zoomScale));
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>): void => {
    if (event.touches.length < 2) {
      pinchStartRef.current = undefined;
    }
    if (event.touches.length === 0) {
      panStartRef.current = undefined;
      if (zoomScale < 1.08 && (zoomScale !== 1 || panOffset.x !== 0 || panOffset.y !== 0)) {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
      }
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
      onKeyDown={(event) => {
        if (zoomed || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          move(event.key === 'ArrowRight' ? 1 : -1);
        }
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
        <span className="gallery-lightbox-title">Suas fotos</span>
        <button
          className="gallery-icon-button"
          type="button"
          aria-pressed={zoomed}
          aria-label={zoomed ? 'Ajustar foto à tela' : 'Ampliar foto'}
          onClick={toggleZoom}
        >
          <ShellIcon name={zoomed ? 'zoom-out' : 'zoom-in'} />
        </button>
        <details className="gallery-lightbox-help">
          <summary aria-label="Como usar a galeria" onClick={() => playInterfaceTap('toggle')}>
            <ShellIcon name="info" />
          </summary>
          <div className="gallery-lightbox-help-content">
            <p>Deslize para mudar de foto. Toque duas vezes ou faça pinça para ampliar.</p>
            <p>Em “Jogar com esta foto”, você escolhe o jogo na próxima tela.</p>
          </div>
        </details>
      </header>

      <div
        ref={stageRef}
        className="gallery-lightbox-stage"
        data-zoomed={zoomed}
        style={
          {
            '--lightbox-zoom': zoomScale.toFixed(3),
            '--lightbox-pan-x': `${Math.round(panOffset.x)}px`,
            '--lightbox-pan-y': `${Math.round(panOffset.y)}px`,
          } as React.CSSProperties
        }
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <GalleryFrame
          key={photo.id}
          photo={photo}
          variant="game"
          index={index}
          eager
          allowRetry
          sizes={GALLERY_LIGHTBOX_SIZES}
          srcSetVariants={GALLERY_LIGHTBOX_VARIANTS}
        />
      </div>

      <footer className="gallery-lightbox-footer">
        <span className="gallery-lightbox-count" aria-live="polite">
          {index + 1} de {photos.length}
        </span>
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
