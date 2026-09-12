import { useState } from 'react';
import type { Photo, PhotoVariant } from '@christmas-games/platform';

interface PhotoPrintProps {
  photo: Photo;
  variant?: PhotoVariant;
  alt?: string;
  eager?: boolean;
}

/** The print reserves its space and never crops or decorates the photograph. */
export function PhotoPrint({
  photo,
  variant = 'thumb',
  alt = '',
  eager = false,
}: PhotoPrintProps): React.JSX.Element {
  const src = photo.variants[variant];
  const [result, setResult] = useState<{ src: string; status: 'ready' | 'error' }>();
  const status = result?.src === src ? result.status : 'loading';
  return (
    <span className={`photo-print photo-print--${photo.orientation}`} data-status={status}>
      {status !== 'ready' ? (
        <span className="photo-print-fallback" role={alt ? 'status' : undefined}>
          {status === 'error' ? 'Foto indisponível' : 'Preparando foto…'}
        </span>
      ) : null}
      {status !== 'error' ? (
        <img
          key={src}
          alt={alt}
          decoding="async"
          height={photo.height}
          width={photo.width}
          loading={eager ? 'eager' : 'lazy'}
          src={src}
          onLoad={() => setResult({ src, status: 'ready' })}
          onError={() => setResult({ src, status: 'error' })}
        />
      ) : null}
    </span>
  );
}
