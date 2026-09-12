/**
 * Static scene material owned by Expresso das Fotos. Session photographs are
 * loaded separately from their authorized, run-scoped derivatives.
 */
const visualAssetBasePath = '/assets/expresso-das-fotos';

export const expressoVisualAssets = {
  background: {
    key: 'expresso-background-night-station',
    url: `${visualAssetBasePath}/backgrounds/estacao-noturna-plataforma-v2.webp`,
  },
  train: {
    key: 'expresso-premium-christmas-locomotive-v1',
    url: `${visualAssetBasePath}/sprites/locomotiva-natal-premium-v1.webp`,
  },
} as const;
