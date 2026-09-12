import type { GameDefinition } from '@christmas-games/platform';

/** Static Hub metadata; importing it does not mount Phaser. */
export const ticTacToeDefinition: GameDefinition = {
  id: 'tic-tac-toe',
  displayName: 'Trinca de Natal',
  shortDescription: 'Use suas fotos para fazer três lembranças em linha.',
  shortRule: 'Faça 3 fotos em linha e vença a rodada.',
  cover: {
    alt: 'Fotos em um mural natalino para fazer três em linha.',
  },
  minPhotos: 1,
  recommendedPhotos: 2,
  photoSelection: 'subset',
  supportsMixedOrientation: true,
};
