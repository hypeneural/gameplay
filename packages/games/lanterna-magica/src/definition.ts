import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata the React shell can import without loading the Phaser runtime. */
export const lanternaMagicaDefinition: GameDefinition = {
  id: 'lanterna-magica',
  displayName: 'Lanterna Mágica',
  shortDescription:
    'Gire os espelhos de latão e conduza a luz mágica para projetar a foto da sua família!',
  shortRule: 'Gire os espelhos e aponte o feixe de luz até a lente do projetor vitoriano.',
  cover: {
    alt: 'Projetor vitoriano de latão com feixes de luz dourada iluminando uma foto familiar.',
  },
  minPhotos: 1,
  recommendedPhotos: 1,
  photoSelection: 'single',
  supportsMixedOrientation: true,
};
