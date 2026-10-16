import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Photo, PhotoVariant } from '@christmas-games/platform';
import { galleryFrameAspectRatio } from '../gallery/galleryFrameGeometry.js';
import { PhotoPrint } from './PhotoPrint.js';

interface GalleryFrameProps {
  photo: Photo;
  variant: PhotoVariant;
  index: number;
  eager?: boolean;
  sizes?: string;
  srcSetVariants?: readonly PhotoVariant[];
  allowRetry?: boolean;
}

/** Decorative matte is outside the full-bleed, intrinsic-ratio photo window. */
export function GalleryFrame({
  photo,
  variant,
  index,
  eager = false,
  sizes,
  srcSetVariants,
  allowRetry = false,
}: GalleryFrameProps): React.JSX.Element {
  const [measured, setMeasured] = useState<{
    photoId: string;
    variant: PhotoVariant;
    ratio: number;
  }>();
  const reservedRatio = galleryFrameAspectRatio(photo, variant);
  const ratio =
    measured?.photoId === photo.id && measured.variant === variant ? measured.ratio : reservedRatio;

  return (
    <span
      className="gallery-frame"
      data-frame-orientation={photo.orientation}
      style={{ '--gallery-frame-ratio': ratio } as CSSProperties}
    >
      <span
        className="gallery-photo-frame gallery-frame-window"
        data-intrinsic-ratio={ratio.toFixed(4)}
        style={{ aspectRatio: ratio }}
      >
        <PhotoPrint
          photo={photo}
          variant={variant}
          eager={eager}
          {...(allowRetry ? { allowRetry } : {})}
          onIntrinsicDimensions={(width, height) => {
            const actualRatio = width / height;
            if (
              Number.isFinite(actualRatio) &&
              actualRatio > 0 &&
              Math.abs(actualRatio / ratio - 1) > 0.0005
            ) {
              setMeasured({ photoId: photo.id, variant, ratio: actualRatio });
            }
          }}
          {...(sizes ? { sizes } : {})}
          {...(srcSetVariants ? { srcSetVariants } : {})}
          alt={`Lembrança de Natal ${index + 1}`}
        />
      </span>
      <span className="gallery-frame-ornament gallery-frame-ornament--tl" aria-hidden="true" />
      <span className="gallery-frame-ornament gallery-frame-ornament--tr" aria-hidden="true" />
      <span className="gallery-frame-ornament gallery-frame-ornament--bl" aria-hidden="true" />
      <span className="gallery-frame-ornament gallery-frame-ornament--br" aria-hidden="true" />
    </span>
  );
}
