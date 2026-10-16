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
}

/** Decorative matte is outside the full-bleed, intrinsic-ratio photo window. */
export function GalleryFrame({
  photo,
  variant,
  index,
  eager = false,
  sizes,
  srcSetVariants,
}: GalleryFrameProps): React.JSX.Element {
  const ratio = galleryFrameAspectRatio(photo, variant);

  return (
    <span
      className="gallery-frame"
      data-frame-orientation={photo.orientation}
      style={{ '--gallery-frame-ratio': ratio } as CSSProperties}
    >
      <span className="gallery-photo-frame gallery-frame-window" style={{ aspectRatio: ratio }}>
        <PhotoPrint
          photo={photo}
          variant={variant}
          eager={eager}
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
