/** Static scene material owned by Guirlanda das Lembranças. */
const visualAssetBasePath = '/assets/guirlanda-das-lembrancas';

export const garlandVisualAssets = {
  hook: {
    key: 'guirlanda-gancho-latao-ambar-v2',
    url: `${visualAssetBasePath}/props/gancho-latao-ambar-v2.webp`,
  },
  background: {
    key: 'guirlanda-cabana-nevada-noturna-v1',
    url: `${visualAssetBasePath}/backgrounds/cabana-nevada-noturna-v1.webp`,
  },
  wreath: {
    key: 'guirlanda-pinho-artesanal-v3',
    url: `${visualAssetBasePath}/sprites/guirlanda-pinho-v3.webp`,
  },
  framePortrait: {
    key: 'guirlanda-moldura-retrato-madeira-latao-v1',
    url: `${visualAssetBasePath}/frames/moldura-retrato-madeira-latao-v1.webp`,
  },
  frameLandscape: {
    key: 'guirlanda-moldura-paisagem-madeira-latao-v1',
    url: `${visualAssetBasePath}/frames/moldura-paisagem-madeira-latao-v1.webp`,
  },
  memoryBox: {
    key: 'guirlanda-caixa-de-lembrancas-nogueira-v1',
    url: `${visualAssetBasePath}/props/caixa-de-lembrancas-nogueira-v1.webp`,
  },
} as const;
