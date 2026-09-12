import type * as Phaser from 'phaser';
import type { Photo } from '@christmas-games/platform';
import { garlandFrameGeometry, garlandFrameKind } from './GarlandLayout.js';
import { garlandVisualAssets } from './visualAssets.js';

export interface PhotoFrameView {
  container: Phaser.GameObjects.Container;
  pivot: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  rimGlow: Phaser.GameObjects.Graphics;
  matte: Phaser.GameObjects.Rectangle;
  photo: Phaser.GameObjects.Image;
  material: Phaser.GameObjects.Image;
}

export function createGarlandPhotoFrame(
  scene: Phaser.Scene,
  texture: string,
  depth: number,
): PhotoFrameView {
  const shadow = scene.add.ellipse(0, 0, 1, 1, 0x03080c, 0.46);
  const rimGlow = scene.add.graphics();
  const matte = scene.add.rectangle(0, 0, 1, 1, 0x24160f);
  const photo = scene.add.image(0, 0, texture);
  const material = scene.add.image(0, 0, garlandVisualAssets.framePortrait.key);
  const body = scene.add.container(0, 0, [rimGlow, matte, photo, material]);
  const pivot = scene.add.container(0, 0, [body]);
  const container = scene.add.container(0, 0, [shadow, pivot]).setDepth(depth);
  return { container, pivot, body, shadow, rimGlow, matte, photo, material };
}

export function layoutGarlandPhotoFrame(
  view: PhotoFrameView,
  photo: Photo,
  texture: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const geometry = garlandFrameGeometry(photo, width, height);
  const aperture = geometry.aperture;
  view.container.setPosition(x, y).setSize(Math.max(72, width), Math.max(72, height));
  // Rotation takes place at the hanging ring, not through the photograph center.
  view.pivot.setPosition(0, -height * 0.43).setAngle(0);
  view.body.setPosition(0, height * 0.43);
  view.shadow
    .setPosition(1, height * 0.45)
    .setSize(width * 0.75, Math.max(7, height * 0.07))
    .setAlpha(0.46);
  view.material
    .setTexture(
      garlandFrameKind(photo) === 'landscape'
        ? garlandVisualAssets.frameLandscape.key
        : garlandVisualAssets.framePortrait.key,
    )
    .setDisplaySize(width, height);
  view.rimGlow
    .clear()
    .lineStyle(3, 0xe9b85d, 0.23)
    .strokeRoundedRect(aperture.x - 4, aperture.y - 4, aperture.width + 8, aperture.height + 8, 14);
  view.matte
    .setPosition(aperture.x + aperture.width / 2, aperture.y + aperture.height / 2)
    .setSize(aperture.width, aperture.height);
  view.photo
    .setTexture(texture)
    .setPosition(
      geometry.photo.x + geometry.photo.width / 2,
      geometry.photo.y + geometry.photo.height / 2,
    )
    .setDisplaySize(geometry.photo.width, geometry.photo.height);
}
