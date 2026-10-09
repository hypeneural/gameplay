import { useEffect, useRef, useState } from 'react';
import type { Photo, Session } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { PhotoPrint } from './PhotoPrint.js';
import { SnowGlobeButton } from './SnowGlobeButton.js';
import { ShellIcon } from './ShellIcon.js';

interface SessionPhotoAlbumProps {
  session: Session;
  photo: Photo;
  onSelect(photoId: string): void;
  compact?: boolean;
  snowBurst?: number;
  onSnow?(): void;
  onOpenGallery?(): void;
}

/** Quick selection stays modal; the full gallery can live in its own route. */
export function SessionPhotoAlbum({
  session,
  photo,
  onSelect,
  compact = false,
  snowBurst = 0,
  onSnow,
  onOpenGallery,
}: SessionPhotoAlbumProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!open && restoreFocus.current) {
      triggerRef.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [open]);
  const touchStart = useRef<{ x: number; y: number } | undefined>(undefined);
  const index = Math.max(
    0,
    session.photos.findIndex((entry) => entry.id === photo.id),
  );
  const selectOffset = (offset: number): void => {
    const next = session.photos[(index + offset + session.photos.length) % session.photos.length];
    if (next && next.id !== photo.id) {
      playInterfaceTap('photo');
      onSelect(next.id);
    }
  };
  const close = (): void => {
    restoreFocus.current = true;
    setOpen(false);
  };
  return (
    <section
      className={`session-album ${compact ? 'session-album--compact' : ''}`}
      aria-label="Sua foto escolhida"
      data-selected-photo-id={photo.id}
      data-testid="photo-selection"
    >
      {!compact ? (
        <>
          <div
            className="album-stack"
            aria-hidden="true"
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              touchStart.current = undefined;
              const touch = event.changedTouches[0];
              if (!start || !touch) return;
              const dx = touch.clientX - start.x;
              const dy = touch.clientY - start.y;
              if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.5)
                selectOffset(dx < 0 ? 1 : -1);
            }}
          >
            <span className="album-paper album-paper--back" />
            <span className="album-paper album-paper--middle" />
            <PhotoPrint photo={photo} variant="card" eager />
            <span className="album-photo-seal">✦</span>
          </div>
          <div className="album-copy">
            <p className="eyebrow">UM NATAL SÓ SEU</p>
            <h2>
              Suas fotos.
              <br />
              Muita magia.
            </h2>
            <p>Escolha uma lembrança para brincar.</p>
            <div className="album-pagination">
              <button
                className="crystal-control album-arrow"
                type="button"
                aria-label="Foto anterior"
                disabled={session.photos.length < 2}
                onClick={() => selectOffset(-1)}
              >
                <ShellIcon name="back" />
              </button>
              <span aria-live="polite" data-testid="album-position">
                {index + 1} de {session.photos.length}
              </span>
              <button
                className="crystal-control album-arrow"
                type="button"
                aria-label="Próxima foto"
                disabled={session.photos.length < 2}
                onClick={() => selectOffset(1)}
              >
                <ShellIcon name="next" />
              </button>
            </div>
          </div>
        </>
      ) : null}
      {onOpenGallery && !compact ? (
        <button
          className="album-cta-primary"
          data-testid="open-full-gallery"
          type="button"
          onClick={() => {
            playInterfaceTap('open');
            onOpenGallery();
          }}
        >
          <span className="album-cta-icon" aria-hidden="true" />
          <span className="album-cta-text">Abrir álbum completo</span>
          <span className="album-cta-sparkle" aria-hidden="true">
            ✦
          </span>
        </button>
      ) : null}
      <div className="album-actions album-actions--secondary">
        <button
          ref={triggerRef}
          className="album-open crystal-control"
          data-testid="open-photo-picker"
          type="button"
          onClick={() => {
            playInterfaceTap('open');
            setOpen(true);
          }}
        >
          <ShellIcon name="photos" /> <span>{compact ? 'Trocar foto' : 'Ver suas fotos'}</span>
        </button>
        {onSnow ? <SnowGlobeButton burst={snowBurst} onSnow={onSnow} /> : null}
      </div>
      {open ? (
        <PhotoPicker
          key={session.id}
          session={session}
          selectedPhotoId={photo.id}
          onClose={close}
          onSelect={(id) => {
            onSelect(id);
            close();
          }}
        />
      ) : null}
    </section>
  );
}

function PhotoPicker({
  session,
  selectedPhotoId,
  onSelect,
  onClose,
}: {
  session: Session;
  selectedPhotoId: string;
  onSelect(id: string): void;
  onClose(): void;
}): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visibleCount, setVisibleCount] = useState(12);
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
  return (
    <dialog
      className="photo-picker"
      ref={dialogRef}
      aria-labelledby="photo-picker-title"
      onCancel={(event) => {
        event.preventDefault();
        playInterfaceTap('back');
        onClose();
      }}
    >
      <header className="photo-picker-header">
        <div>
          <p className="eyebrow">SEU ÁLBUM DE NATAL</p>
          <h2 id="photo-picker-title">Escolha sua foto</h2>
        </div>
        <button
          className="shell-icon-button crystal-control"
          type="button"
          aria-label="Fechar fotos"
          onClick={() => {
            playInterfaceTap('back');
            onClose();
          }}
        >
          <ShellIcon name="close" />
        </button>
      </header>
      <div className="photo-picker-scroll">
        <div className="photo-grid" aria-label="Fotos da sessão">
          {session.photos.slice(0, visibleCount).map((photo, index) => (
            <button
              type="button"
              className={`photo-card ${photo.orientation}`}
              data-testid={`photo-${photo.id}`}
              key={photo.id}
              aria-label={`Foto ${index + 1} da sessão`}
              aria-pressed={photo.id === selectedPhotoId}
              onClick={() => {
                playInterfaceTap('photo');
                onSelect(photo.id);
              }}
            >
              <PhotoPrint photo={photo} />
              <span className="photo-check" aria-hidden="true">
                {photo.id === selectedPhotoId ? '✓' : index + 1}
              </span>
            </button>
          ))}
        </div>
        {visibleCount < session.photos.length ? (
          <div className="photo-sentinel" data-testid="photo-sentinel">
            <p>
              {Math.min(visibleCount, session.photos.length)} de {session.photos.length} lembranças
            </p>
            <button
              type="button"
              className="button secondary crystal-control"
              data-testid="load-more-photos"
              onClick={() => {
                playInterfaceTap('open');
                setVisibleCount((count) => Math.min(count + 12, session.photos.length));
              }}
            >
              <ShellIcon name="photos" /> Ver mais fotos
            </button>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
