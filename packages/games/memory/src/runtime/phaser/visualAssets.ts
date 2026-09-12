/**
 * Static scene material owned by Memory. Customer photographs never appear in
 * this bundle; each file is separately catalogued in the Memory manifest.
 */
const visualAssetBasePath = '/assets/memory';

export const memoryVisualAssets = {
  background: {
    key: 'memory-background-winter-village',
    url: `${visualAssetBasePath}/backgrounds/vila-nevada-noite-v1.webp`,
  },
  snow: {
    key: 'memory-snowflake',
    url: `${visualAssetBasePath}/ui/floco-neve.svg`,
  },
} as const;
