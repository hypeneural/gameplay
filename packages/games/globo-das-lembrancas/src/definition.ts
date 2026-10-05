import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata the React shell can import without loading the Phaser runtime. */
export const globoDasLembrancasDefinition: GameDefinition = {
  id: 'globo-das-lembrancas',
  displayName: 'Globo das Lembranças',
  shortDescription: 'Dê corda na caixinha de música e veja sua foto nevar no globo de cristal.',
  shortRule: 'Gire a chave de ouro e limpe o vidro para acordar a magia.',
  cover: {
    alt: 'Um globo de neve de cristal iluminado com uma fotografia de família em seu interior.',
  },
  minPhotos: 1,
  recommendedPhotos: 1,
  photoSelection: 'single',
  supportsMixedOrientation: true,
};
