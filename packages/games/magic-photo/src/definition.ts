import type { GameDefinition } from '@christmas-games/platform';

export const magicPhotoDefinition: GameDefinition = {
  id: 'magic-photo',
  displayName: 'A Magia da Minha Foto de Natal',
  shortDescription: 'Abra um presente, encontre estrelas e descongele sua lembrança.',
  shortRule: 'Toque no presente. Sua foto está cheia de magia!',
  cover: { alt: 'Um presente rubi com laço dourado guarda uma fotografia de Natal.' },
  minPhotos: 1,
  recommendedPhotos: 1,
  photoSelection: 'single',
  supportsMixedOrientation: true,
};
