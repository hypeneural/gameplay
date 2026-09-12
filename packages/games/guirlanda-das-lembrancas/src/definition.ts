import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata the React shell can import without loading the Phaser runtime. */
export const guirlandaDasLembrancasDefinition: GameDefinition = {
  id: 'guirlanda-das-lembrancas',
  displayName: 'Guirlanda das Lembranças',
  shortDescription: 'Pendure as fotos da sessão e acenda uma guirlanda de Natal.',
  shortRule: 'Toque na foto e depois numa estrela — ou arraste a moldura até ela.',
  cover: { alt: 'Uma guirlanda de pinho com molduras de fotos e estrelas douradas.' },
  minPhotos: 1,
  recommendedPhotos: 6,
  photoSelection: 'subset',
  supportsMixedOrientation: true,
};
