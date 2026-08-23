import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata imported by the React shell without loading the Phaser runtime. */
export const devSmokeDefinition: GameDefinition = {
  id: 'dev-smoke',
  displayName: 'Prova de Natal',
  shortDescription: 'Uma pequena prova de entrada, toque e saída segura.',
  shortRule: 'Toque em um cartão para concluir a prova.',
  cover: { alt: 'Dois cartões natalinos proporcionais, um retrato e um paisagem.' },
  minPhotos: 1,
  recommendedPhotos: 2,
  photoSelection: 'single',
  supportsMixedOrientation: true,
};
