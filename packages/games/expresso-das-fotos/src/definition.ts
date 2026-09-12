import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata the React shell can import without loading the Phaser runtime. */
export const expressoDasFotosDefinition: GameDefinition = {
  id: 'expresso-das-fotos',
  displayName: 'Expresso das Fotos',
  shortDescription: 'Encontre a foto igual e leve o expresso até a estação certa.',
  shortRule: 'Ache a foto igual, toque na estação e veja o trem seguir pelo trilho.',
  cover: { alt: 'Um expresso natalino levando uma lembrança até uma estação iluminada.' },
  minPhotos: 1,
  recommendedPhotos: 6,
  photoSelection: 'subset',
  supportsMixedOrientation: true,
};
