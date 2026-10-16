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
  return (
    <span className="gallery-frame" data-frame-orientation={photo.orientation}>
      <span
        className="gallery-photo-frame gallery-frame-window"
        style={{ aspectRatio: galleryFrameAspectRatio(photo, variant) }}
      >
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
