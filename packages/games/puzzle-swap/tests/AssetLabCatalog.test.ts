import { describe, expect, it } from 'vitest';
import { puzzleAssetLabCatalog } from '../src/assets/assetLabCatalog.js';

describe('Puzzle Asset Lab catalog', () => {
  it('contains only reviewed public delivery data, never source-file data', () => {
    expect(puzzleAssetLabCatalog).toHaveLength(13);
    expect(JSON.stringify(puzzleAssetLabCatalog)).not.toMatch(/apps\\|C:|EST[ÚU]DIO|file/iu);
    expect(puzzleAssetLabCatalog.every((asset) => asset.transferBytes > 0)).toBe(true);
    expect(
      puzzleAssetLabCatalog.every((asset) =>
        asset.preview.kind === 'imagem'
          ? asset.preview.publicPath.startsWith('/assets/puzzle-swap/')
          : asset.preview.sources.every((source) =>
              source.publicPath.startsWith('/assets/puzzle-swap/'),
            ),
      ),
    ).toBe(true);
  });

  it('keeps audio alternatives as one role and preserves their exact transfer choices', () => {
    const sounds = puzzleAssetLabCatalog.filter((asset) => asset.kind === 'som');

    expect(sounds).toHaveLength(6);
    expect(sounds.every((sound) => sound.preview.sources.length === 2)).toBe(true);
    expect(
      sounds.every((sound) =>
        sound.preview.sources.some((source) => source.bytes === sound.transferBytes),
      ),
    ).toBe(true);
  });
});
