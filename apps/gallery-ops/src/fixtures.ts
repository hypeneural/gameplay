/** Deterministic, explicitly synthetic fixture. NEVER ship to a live administrative API. */
import type { GalleryOrder, GalleryState } from './domain.js';
const names = [
  'Família Exemplo A',
  'Família Exemplo B',
  'Família Exemplo C',
  'Família Exemplo D',
  'Família Exemplo E',
  'Família Exemplo F',
  'Família Exemplo G',
  'Família Exemplo H',
];
const packages = ['Então é Natal', 'Ho-Ho-Ho', 'Boas Festas'];
const crmStatuses = [
  'Pagamento confirmado',
  'Sessão agendada',
  'Sessão confirmada',
  'Seleção confirmada',
  'Aguardando retirada',
  'Pedido concluído',
];
const states: GalleryState[] = [
  'no_session',
  'no_upload',
  'preparing',
  'incomplete',
  'published_unverified',
  'published_unverified',
  'revoked',
  'unavailable',
];
const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;
export function fixtureOrders(): GalleryOrder[] {
  return Array.from({ length: 48 }, (_, i) => {
    const state = states[i % states.length]!;
    const sessionDay = 6 + ((i * 3) % 25);
    const photoCount =
      state === 'published_unverified' ? 12 + (i % 27) : state === 'incomplete' ? 3 : 0;
    return {
      orderId: 9001 + i,
      clientName: `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
      clientWhatsapp: i % 7 === 0 ? null : '554899900' + String(1000 + i),
      clientPhone: i % 7 === 0 ? '483220' + String(1000 + i) : null,
      clientEmail: i % 5 === 0 ? null : 'familia.exemplo' + (i + 1) + '@example.invalid',
      packageName: packages[i % packages.length]!,
      crmStatus: crmStatuses[(i * 5) % crmStatuses.length]!,
      createdAt: day(1 + (i % 24)),
      sessionAt: i % 9 === 0 ? null : day(sessionDay),
      firstUploadAt: ['preparing', 'incomplete', 'published_unverified', 'revoked'].includes(state)
        ? day(Math.min(28, sessionDay + 1))
        : null,
      publishedAt: state === 'published_unverified' ? day(Math.min(28, sessionDay + 2)) : null,
      publishedPhotos: state === 'unavailable' ? null : photoCount,
      preparingPhotos: state === 'preparing' ? 6 + (i % 24) : state === 'incomplete' ? null : 0,
      state,
      crmOrderUrl: null,
    };
  });
}
