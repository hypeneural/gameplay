import { useState } from 'react';
import type { Photo, PhotoVariant } from '@christmas-games/platform';

interface PhotoPrintProps {
  photo: Photo;
  variant?: PhotoVariant;
  alt?: string;
  eager?: boolean;
  sizes?: string;
  srcSetVariants?: readonly PhotoVariant[];
}

/** The print reserves its space and never crops or decorates the photograph. */
export function PhotoPrint({
  photo,
  variant = 'thumb',
  alt = '',
  eager = false,
  sizes,
  srcSetVariants,
}: PhotoPrintProps): React.JSX.Element {
  const src = photo.variants[variant];
  const metrics = photo.variantMetrics?.[variant];
  const srcSet = buildSrcSet(photo, srcSetVariants);
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
          height={metrics?.height ?? photo.height}
          width={metrics?.width ?? photo.width}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          onLoad={() => setResult({ src, status: 'ready' })}
          onError={() => setResult({ src, status: 'error' })}
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
