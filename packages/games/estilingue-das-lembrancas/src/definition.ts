import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata the React shell can import without loading the Phaser runtime. */
export const estilingueDasLembrancasDefinition: GameDefinition = {
  id: 'estilingue-das-lembrancas',
  displayName: 'Estilingue das Lembranças',
  shortDescription:
    'Mire com o estilingue natalino e acerte os alvos para iluminar a moldura da sua foto.',
  shortRule:
    'Puxe a bola de neve para trás, aponte para os alvos e solte para acender a moldura mágica.',
  cover: {
    alt: 'Um estilingue de madeira e latão disparando bolas de neve contra alvos natalinos ao redor de uma moldura de foto.',
  },
  minPhotos: 1,
  recommendedPhotos: 1,
  photoSelection: 'single',
  supportsMixedOrientation: true,
};
