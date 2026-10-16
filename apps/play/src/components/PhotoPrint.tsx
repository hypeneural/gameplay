import { useEffect, useRef, useState } from 'react';
import type { Photo, PhotoVariant } from '@christmas-games/platform';

interface PhotoPrintProps {
  photo: Photo;
  variant?: PhotoVariant | undefined;
  alt?: string | undefined;
  eager?: boolean | undefined;
  sizes?: string | undefined;
  srcSetVariants?: readonly PhotoVariant[] | undefined;
  sessionKey?: string | undefined;
  allowRetry?: boolean | undefined;
  onIntrinsicDimensions?: ((width: number, height: number) => void) | undefined;
}

interface DisplayedPhoto {
  key: string;
  src: string;
  srcSet: string | undefined;
  sizes: string | undefined;
  width: number;
  height: number;
  orientation: Photo['orientation'];
  sessionKey: string | undefined;
}

/**
 * The print reserves its space and never crops or decorates the photograph.
 * When switching photos within the same session, it retains the previous
 * decoded image in the single DOM `<img>` until the new target finishes
 * decoding off-DOM, preventing flicker and stale out-of-order overwrites.
 */
export function PhotoPrint({
  photo,
  variant = 'thumb',
  alt = '',
  eager = false,
  sizes,
  srcSetVariants,
  sessionKey,
  allowRetry = false,
  onIntrinsicDimensions,
}: PhotoPrintProps): React.JSX.Element {
  const [retryNonce, setRetryNonce] = useState(0);
  const src = photo.variants[variant];
  const metrics = photo.variantMetrics?.[variant];
  const srcSet = buildSrcSet(photo, srcSetVariants);
  const resolvedSizes = srcSet ? sizes : undefined;
  const width = metrics?.width ?? photo.width;
  const height = metrics?.height ?? photo.height;
  const targetKey = `${sessionKey ?? ''}::${photo.id}::${variant}::${src}::${srcSet ?? ''}::${retryNonce}`;

  const [displayed, setDisplayed] = useState<DisplayedPhoto | undefined>(undefined);
  const [errorKey, setErrorKey] = useState<string | undefined>(undefined);
  const generationRef = useRef(0);
  const previousSessionKeyRef = useRef(sessionKey);

  // Immediately invalidate retained photo if sessionKey changes.
  const activeDisplayed = resolveSessionDisplayedPhoto(displayed, sessionKey);

  useEffect(() => {
    if (previousSessionKeyRef.current !== sessionKey) {
      previousSessionKeyRef.current = sessionKey;
      generationRef.current += 1;
      setDisplayed(undefined);
      setErrorKey(undefined);
    }
  }, [sessionKey]);

  const isTargetDisplayed = activeDisplayed?.key === targetKey;
  const isError = errorKey === targetKey;
  const isTransitioning = Boolean(activeDisplayed && !isTargetDisplayed && !isError);

  useEffect(() => {
    if (!activeDisplayed || isTargetDisplayed || isError) {
      return;
    }
    if (typeof window === 'undefined' || typeof window.Image !== 'function') {
      setDisplayed({
        key: targetKey,
        src,
        srcSet,
        sizes: resolvedSizes,
        width,
        height,
        orientation: photo.orientation,
        sessionKey,
      });
      return;
    }

    const generation = ++generationRef.current;
    let cancelled = false;
    const probe = new window.Image();
    probe.decoding = 'async';
    if (resolvedSizes) {
      probe.sizes = resolvedSizes;
    }
    if (srcSet) {
      probe.srcset = srcSet;
    }
    probe.onload = () => {
      const finalize = (): void => {
        if (!isCurrentPhotoGeneration(generationRef.current, generation, cancelled)) return;
        setDisplayed({
          key: targetKey,
          src,
          srcSet,
          sizes: resolvedSizes,
          width,
          height,
          orientation: photo.orientation,
          sessionKey,
        });
        setErrorKey(undefined);
      };
      if (typeof probe.decode === 'function') {
        void probe.decode().then(finalize, finalize);
      } else {
        finalize();
      }
    };
    probe.onerror = () => {
      if (!isCurrentPhotoGeneration(generationRef.current, generation, cancelled)) return;
      setDisplayed(undefined);
      setErrorKey(targetKey);
    };
    probe.src = src;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [
    activeDisplayed,
    height,
    isError,
    isTargetDisplayed,
    photo.orientation,
    resolvedSizes,
    sessionKey,
    src,
    srcSet,
    targetKey,
    width,
  ]);

  const status: 'loading' | 'ready' | 'error' = isError
    ? 'error'
    : activeDisplayed
      ? 'ready'
      : 'loading';

  const renderedPhoto = activeDisplayed ?? {
    key: targetKey,
    src,
    srcSet,
    sizes: resolvedSizes,
    width,
    height,
    orientation: photo.orientation,
    sessionKey,
  };

  return (
    <span
      className={`photo-print photo-print--${renderedPhoto.orientation}`}
      data-status={status}
      data-transitioning={isTransitioning ? 'true' : undefined}
    >
      {status !== 'ready' ? (
        <span className="photo-print-fallback" role={alt ? 'status' : undefined}>
          <span>{status === 'error' ? 'Foto indisponível' : 'Preparando foto…'}</span>
          {status === 'error' && allowRetry ? (
            <button
              className="photo-print-retry"
              type="button"
              onClick={() => {
                generationRef.current += 1;
                setErrorKey(undefined);
                setRetryNonce((n) => n + 1);
              }}
            >
              Tentar novamente
            </button>
          ) : null}
        </span>
      ) : null}
      {status !== 'error' ? (
        <img
          alt={alt}
          decoding="async"
          height={renderedPhoto.height}
          width={renderedPhoto.width}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          src={renderedPhoto.src}
          srcSet={renderedPhoto.srcSet}
          sizes={renderedPhoto.sizes}
          onLoad={(event) => {
            if (renderedPhoto.key === targetKey) {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth > 0 && naturalHeight > 0) {
                onIntrinsicDimensions?.(naturalWidth, naturalHeight);
              }
            }
            if (activeDisplayed) return;
            generationRef.current += 1;
            setDisplayed({
              key: targetKey,
              src,
              srcSet,
              sizes: resolvedSizes,
              width,
              height,
              orientation: photo.orientation,
              sessionKey,
            });
            setErrorKey(undefined);
          }}
          onError={() => {
            if (activeDisplayed) return;
            generationRef.current += 1;
            setDisplayed(undefined);
            setErrorKey(targetKey);
          }}
        />
      ) : null}
    </span>
  );
}

export function resolveSessionDisplayedPhoto<T extends { sessionKey: string | undefined }>(
  displayed: T | undefined,
  sessionKey: string | undefined,
): T | undefined {
  return displayed && displayed.sessionKey === sessionKey ? displayed : undefined;
}

export function isCurrentPhotoGeneration(
  latestGeneration: number,
  candidateGeneration: number,
  cancelled: boolean,
): boolean {
  return !cancelled && latestGeneration === candidateGeneration;
}

export function buildSrcSet(
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
