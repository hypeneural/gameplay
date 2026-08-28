import type { GameDefinition } from '@christmas-games/platform';

/** Static metadata is safe for the Hub and never mounts Phaser. */
export const memoryDefinition: GameDefinition = {
  id: 'memory',
  displayName: 'Memórias de Natal',
  shortDescription: 'Encontre os pares das fotos para montar um álbum especial.',
  shortRule: 'Toque em duas cartas para encontrar as fotos iguais.',
  cover: {
    alt: 'Cartas natalinas que escondem fotos da mesma sessão.',
  },
  minPhotos: 4,
  recommendedPhotos: 4,
  photoSelection: 'subset',
  supportsMixedOrientation: true,
};
