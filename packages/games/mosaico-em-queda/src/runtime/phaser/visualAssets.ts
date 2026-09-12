import type { QualityTier } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';

export type MosaicVisualAssetId =
  | 'workshop-background'
  | 'board-surface'
  | 'photo-cell-frame'
  | 'memory-frame'
  | 'dock-panel'
  | 'button-left'
  | 'button-rotate'
  | 'button-right'
  | 'button-down'
  | 'next-pedestal'
  | 'progress-garland'
  | 'sparkle'
  | 'snow-sweep'
  | 'warm-light'
  | 'victory-ribbon';

interface MosaicVisualAsset {
  readonly height: number;
  readonly id: MosaicVisualAssetId;
  readonly low: 'keep' | 'omit';
  readonly path: string;
  readonly reducedMotion: 'keep' | 'omit';
  readonly width: number;
}

const root = '/assets/mosaico-em-queda';

/**
 * Runtime companion to assets/manifest.json. Keys are scoped per run so a
 * Phaser game can release its owned textures on exit without touching another
 * game instance.
 */
export const mosaicVisualAssets: readonly MosaicVisualAsset[] = [
  asset('workshop-background', 'backgrounds/oficina-vertical-v2.webp', 768, 1536),
  asset('board-surface', 'ui/board-surface-v1.svg', 640, 1120),
  asset('photo-cell-frame', 'ui/presente-foto-frame-v1.svg', 128, 128),
  asset('memory-frame', 'ui/moldura-memoria-oficina-v1.svg', 256, 256),
  asset('dock-panel', 'ui/dock-panel-v1.svg', 720, 164),
  asset('button-left', 'ui/button-left-v1.svg', 160, 160),
  asset('button-rotate', 'ui/button-rotate-v1.svg', 160, 160),
  asset('button-right', 'ui/button-right-v1.svg', 160, 160),
  asset('button-down', 'ui/button-down-v1.svg', 160, 160),
  asset('next-pedestal', 'ui/next-pedestal-v1.svg', 176, 176),
  asset('progress-garland', 'vfx/guirlanda-progresso-v1.svg', 768, 128),
  asset('sparkle', 'vfx/brilho-v1.svg', 64, 64, 'omit', 'omit'),
  asset('snow-sweep', 'vfx/sweep-neve-v1.svg', 768, 112, 'omit', 'omit'),
  asset('warm-light', 'vfx/luz-quente-v1.svg', 128, 128, 'omit', 'omit'),
  asset('victory-ribbon', 'vfx/faixa-vitoria-v1.svg', 640, 144),
];

export type MosaicVisualTextureKeys = Readonly<Record<MosaicVisualAssetId, string>>;

export function mosaicVisualTextureKeys(runId: string): MosaicVisualTextureKeys {
  return Object.fromEntries(
    mosaicVisualAssets.map((asset) => [asset.id, `mosaico-${runId}-${asset.id}`]),
  ) as MosaicVisualTextureKeys;
}

export function preloadMosaicVisualAssets(
  loader: PhaserModule.Loader.LoaderPlugin,
  textureKeys: MosaicVisualTextureKeys,
  quality: QualityTier,
  reducedMotion: boolean,
): readonly string[] {
  const loaded: string[] = [];
  for (const asset of mosaicVisualAssets) {
    if (!shouldLoad(asset, quality, reducedMotion)) continue;
    const key = textureKeys[asset.id];
    if (asset.path.endsWith('.svg'))
      loader.svg(key, asset.path, { width: asset.width, height: asset.height });
    else loader.image(key, asset.path);
    loaded.push(key);
  }
  return loaded;
}

function asset(
  id: MosaicVisualAssetId,
  path: string,
  width: number,
  height: number,
  low: 'keep' | 'omit' = 'keep',
  reducedMotion: 'keep' | 'omit' = 'keep',
): MosaicVisualAsset {
  return { height, id, low, path: `${root}/${path}`, reducedMotion, width };
}

function shouldLoad(
  asset: MosaicVisualAsset,
  quality: QualityTier,
  reducedMotion: boolean,
): boolean {
  return (
    !(quality === 'LOW' && asset.low === 'omit') &&
    !(reducedMotion && asset.reducedMotion === 'omit')
  );
}
