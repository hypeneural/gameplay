import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata the React shell can import without loading the Phaser runtime. */
export const mosaicoEmQuedaDefinition: GameDefinition = {
  id: 'mosaico-em-queda',
  displayName: 'Mosaico em Queda',
  shortDescription: 'Complete fileiras de fotos para revelar uma lembrança especial.',
  shortRule: 'Mova e gire a peça para completar uma fileira.',
  cover: { alt: 'Peças de fotos sobre um mural natalino de madeira.' },
  minPhotos: 1,
  recommendedPhotos: 4,
  photoSelection: 'subset',
  supportsMixedOrientation: true,
};
