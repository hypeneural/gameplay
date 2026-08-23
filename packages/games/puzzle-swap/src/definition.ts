import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata is safe for the Hub and never imports Phaser. */
export const puzzleSwapDefinition: GameDefinition = {
  id: 'puzzle-swap',
  displayName: 'Quebra-cabeça da sua foto',
  shortDescription: 'Troque duas peças para reconstruir uma foto especial.',
  shortRule: 'Toque em duas peças para trocá-las, ou arraste uma até outra.',
  cover: {
    alt: 'Uma foto de Natal dividida em peças de quebra-cabeça retangulares.',
  },
  minPhotos: 1,
  recommendedPhotos: 1,
  photoSelection: 'single',
  supportsMixedOrientation: true,
};
