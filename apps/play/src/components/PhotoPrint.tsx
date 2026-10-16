import { useState } from 'react';
import type { Photo, PhotoVariant } from '@christmas-games/platform';

interface PhotoPrintProps {
  photo: Photo;
  variant?: PhotoVariant;
  alt?: string;
  eager?: boolean;
  sizes?: string;
  srcSetVariants?: readonly PhotoVariant[];
  allowRetry?: boolean;
  onIntrinsicDimensions?(width: number, height: number): void;
}

/** The print reserves its space and never crops or decorates the photograph. */
export function PhotoPrint({
  photo,
  variant = 'thumb',
  alt = '',
  eager = false,
  sizes,
  srcSetVariants,
  allowRetry = false,
  onIntrinsicDimensions,
}: PhotoPrintProps): React.JSX.Element {
  const src = photo.variants[variant];
  const metrics = photo.variantMetrics?.[variant];
  const srcSet = buildSrcSet(photo, srcSetVariants);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    src: string;
    attempt: number;
    status: 'ready' | 'error';
  }>();
  const status = result?.src === src && result.attempt === attempt ? result.status : 'loading';
  return (
    <span className={`photo-print photo-print--${photo.orientation}`} data-status={status}>
      {status !== 'ready' ? (
        <span className="photo-print-fallback" role={alt ? 'status' : undefined}>
          {status === 'error' ? (
            allowRetry ? (
              <button
                className="photo-print-retry"
                type="button"
                onClick={() => setAttempt((current) => current + 1)}
              >
                Tentar novamente
              </button>
            ) : (
              'Foto indisponível'
            )
          ) : (
            'Preparando foto…'
          )}
        </span>
      ) : null}
      {status !== 'error' ? (
        <img
          key={`${src}#${attempt}`}
          alt={alt}
          decoding="async"
          height={metrics?.height ?? photo.height}
          width={metrics?.width ?? photo.width}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              onIntrinsicDimensions?.(image.naturalWidth, image.naturalHeight);
            }
            setResult({ src, attempt, status: 'ready' });
          }}
          onError={() => setResult({ src, attempt, status: 'error' })}
        />
      ) : null}
    </span>
  );
}

function buildSrcSet(
  photo: Photo,
  variants: readonly PhotoVariant[] | undefined,
): string | undefined {
  if (!variants?.length || !photo.variantMetrics) return undefined;

  const sources = new Map<number, string>();
  for (const variant of variants) {
    const metrics = photo.variantMetrics[variant];
    const url = photo.variants[variant];
    if (!metrics || metrics.width <= 0 || !url) continue;
    sources.set(metrics.width, url);
  }

  if (sources.size === 0) return undefined;
  return [...sources.entries()]
    .sort(([left], [right]) => left - right)
    .map(([width, url]) => `${url} ${width}w`)
    .join(', ');
}
