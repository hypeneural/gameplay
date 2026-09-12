import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata the React shell can import without loading the Phaser runtime. */
export const renaDasLembrancasDefinition: GameDefinition = {
  id: 'rena-das-lembrancas',
  displayName: 'Rudolph — Chuva de Lembranças',
  shortDescription: 'Guie Rudolph pela neve e salve suas fotos no Álbum de Natal.',
  shortRule: 'Toque ou deslize para guiar Rudolph.',
  cover: { alt: 'Rudolph espera na neve enquanto uma fotografia de Natal flutua em sua moldura.' },
  minPhotos: 3,
  recommendedPhotos: 8,
  photoSelection: 'subset',
  supportsMixedOrientation: true,
};
