import { createPhotoSurface } from '@christmas-games/platform';
import type { Photo } from '@christmas-games/platform';

type PhotoShape = Pick<Photo, 'aspectRatio' | 'orientation' | 'width' | 'height'>;
export const frameApertures = {
  portrait: { width: 0.64, height: 0.52, y: 0.12 },
  landscape: { width: 0.78, height: 0.52, y: 0.065 },
} as const;

export function garlandFrameKind(photo: PhotoShape): keyof typeof frameApertures {
  return photo.aspectRatio >= 0.95 ? 'landscape' : 'portrait';
}

/** All photo rectangles are inside the reviewed alpha opening, never outside the rim. */
export function garlandFrameGeometry(photo: PhotoShape, width: number, height: number) {
  const opening = frameApertures[garlandFrameKind(photo)];
  const aperture = {
    x: (-width * opening.width) / 2,
    y: height * (opening.y - opening.height / 2),
    width: width * opening.width,
    height: height * opening.height,
  };
  const inset = Math.max(1.5, Math.min(aperture.width, aperture.height) * 0.018);
  const surface = createPhotoSurface(
    photo,
    {
      x: aperture.x + inset,
      y: aperture.y + inset,
      width: aperture.width - inset * 2,
      height: aperture.height - inset * 2,
    },
    'contain',
  );
  return { aperture, photo: surface.photo };
}

export function garlandFrameDimensions(photo: PhotoShape, maxWidth: number, maxHeight: number) {
  const opening = frameApertures[garlandFrameKind(photo)];
  // Match the opening to the photograph. A restrained material stretch is
  // preferable to cropping the family; extreme ratios still use contain.
  const ratio = Math.max(0.6, Math.min(1.8, photo.aspectRatio));
  const displayRatio = (ratio * opening.height) / opening.width;
  const width = Math.min(maxWidth, maxHeight * displayRatio);
  return { width, height: width / displayRatio };
}

/** Geometry uses CSS pixels. The React shell already subtracts device safe areas. */
export function createGarlandLayout(
  width: number,
  height: number,
  photo: PhotoShape,
  completed = false,
) {
  const bottomReserved = completed ? 176 : 0;
  const availableBottom = height - bottomReserved;
  const short = height < 700;
  const stageTop = short ? 90 : 112;
  const boxWidth = Math.min(width * 0.6, short ? 172 : 242);
  const boxHeight = (boxWidth * 352) / 512;
  const boxY = height - boxHeight * 0.46 - 14;
  const stageBottom = completed ? availableBottom - 12 : boxY - boxHeight * 0.36 - 24;
  const stageHeight = Math.max(228, stageBottom - stageTop);
  const stageWidth = Math.min(width - 16, 588);
  const centreX = width / 2;
  const wreathY = stageTop + stageHeight / 2;
  const sideX = Math.min(stageWidth / 2 - 44, width / 2 - 52);
  const protectedWidth = (sideX * 2 - 80) / frameApertures[garlandFrameKind(photo)].width;
  const heroMaxWidth = Math.max(150, Math.min(width - 112, stageWidth * 0.76, protectedWidth));
  const hero = garlandFrameDimensions(photo, heroMaxWidth, stageHeight * 0.91);
  // Shift the object up so its aperture (below the velvet loop) is centered.
  const centreY = wreathY - hero.height * frameApertures[garlandFrameKind(photo)].y * 0.65;
  const rowGap = Math.max(78, Math.min(stageHeight * 0.32, 180));
  const slots = [-1, 1].flatMap((side) =>
    [-1, 0, 1].map((row) => ({
      x: centreX + side * sideX,
      y: wreathY + row * rowGap,
    })),
  );
  return {
    centreX,
    centreY,
    hero,
    slots,
    wreath: { x: centreX, y: wreathY, width: stageWidth, height: stageHeight },
    box: { x: centreX, y: boxY, width: boxWidth, height: boxHeight, visible: !completed },
    coach: { x: centreX, y: short ? 76 : 88, width: Math.min(width - 40, 400) },
    controls: { sound: { x: width - 94, y: 32 }, pause: { x: width - 36, y: 32 } },
    slotMaxWidth: Math.min(96, Math.max(80, width * 0.225)),
    slotMaxHeight: Math.min(rowGap - 10, 142),
    completionY: Math.min(availableBottom - 16, stageBottom + 10),
  };
}

export type GarlandLayout = ReturnType<typeof createGarlandLayout>;
