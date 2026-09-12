export const visualAssets = [
  'gift-real-v2',
  'frost-real-v2',
  'snow-edge-v2',
  'winter-night-v2',
] as const;
export const visualKey = (name: (typeof visualAssets)[number]): string => `magic-photo-${name}`;
