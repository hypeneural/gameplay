/** Pure, privacy-minimized projection. Never ingest customer phones, participants or capability URLs. */
export type GalleryState =
  | 'no_session'
  | 'no_upload'
  | 'preparing'
  | 'incomplete'
  | 'published_unverified'
  | 'revoked'
  | 'unavailable';
export type StateFilter = 'all' | 'pending' | GalleryState;
export type DateField = 'createdAt' | 'sessionAt' | 'firstUploadAt' | 'publishedAt';
export type PhotoRange = 'all' | 'zero' | '1-10' | '11-25' | '26+';
export type SortKey =
  | 'orderId'
  | 'clientName'
  | 'packageName'
  | 'createdAt'
  | 'sessionAt'
  | 'firstUploadAt'
  | 'publishedAt'
  | 'publishedPhotos'
  | 'state';

export interface GalleryOrder {
  orderId: number;
  clientName: string;
  packageName: string;
  crmStatus: string;
  createdAt: string | null;
  sessionAt: string | null;
  firstUploadAt: string | null;
  publishedAt: string | null;
  publishedPhotos: number | null;
  preparingPhotos: number | null;
  state: GalleryState;
  /** Only server-authorized administration routes, never customer capability links. */
  crmOrderUrl: string | null;
}
export interface GalleryFilters {
  search: string;
  state: StateFilter;
  packageName: string;
  crmStatus: string;
  dateField: DateField;
  dateFrom: string;
  dateTo: string;
  photos: PhotoRange;
}
export const EMPTY_FILTERS: GalleryFilters = {
  search: '',
  state: 'all',
  packageName: 'all',
  crmStatus: 'all',
  dateField: 'sessionAt',
  dateFrom: '',
  dateTo: '',
  photos: 'all',
};
export const STATES: Readonly<
  Record<GalleryState, { label: string; tone: string; description: string }>
> = {
  no_session: {
    label: 'Sem sessão Gameplay',
    tone: 'neutral',
    description: 'Pedido válido, sem sessão digital criada',
  },
  no_upload: {
    label: 'Sem publicação',
    tone: 'neutral',
    description: 'Sessão criada, nenhuma revisão publicada',
  },
  preparing: {
    label: 'Em preparação',
    tone: 'amber',
    description: 'Revisão em preparo; fotos ainda não disponíveis',
  },
  incomplete: { label: 'Incompleta', tone: 'red', description: 'Revisão ou blobs inconsistentes' },
  published_unverified: {
    label: 'Publicada · acesso não verificado',
    tone: 'green',
    description: 'Manifesto pronto, mas navegador e jogos não comprovados',
  },
  revoked: { label: 'Revogada', tone: 'red', description: 'Acesso da sessão revogado' },
  unavailable: {
    label: 'Integração indisponível',
    tone: 'red',
    description: 'Erro de consulta: não equivale a ausência de galeria',
  },
};
export const isPending = (state: GalleryState): boolean => state !== 'published_unverified';
export function projectGameplayState(
  state: 'not_found' | 'not_published' | 'partial' | 'revoked' | 'published_unverified' | null,
  preparation: 'none' | 'staged' | 'invalid' | null,
  failed = false,
): GalleryState {
  if (failed || state === null) return 'unavailable';
  if (state === 'not_found') return 'no_session';
  if (state === 'revoked') return 'revoked';
  if (preparation === 'invalid') return 'incomplete';
  if (state === 'partial') return 'incomplete';
  if (state === 'not_published' && preparation === 'staged') return 'preparing';
  if (state === 'not_published') return 'no_upload';
  return 'published_unverified';
}
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}
function dateOnly(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}
export function filterOrders(
  orders: readonly GalleryOrder[],
  filters: GalleryFilters,
): GalleryOrder[] {
  const q = normalize(filters.search);
  return orders.filter((o) => {
    const text = normalize(`${o.orderId} ${o.clientName} ${o.packageName}`);
    if (q && !text.includes(q.replace(/^#/, ''))) return false;
    if (
      filters.state === 'pending'
        ? !isPending(o.state)
        : filters.state !== 'all' && o.state !== filters.state
    )
      return false;
    if (filters.packageName !== 'all' && o.packageName !== filters.packageName) return false;
    if (filters.crmStatus !== 'all' && o.crmStatus !== filters.crmStatus) return false;
    const when = dateOnly(o[filters.dateField]);
    if (filters.dateFrom && (!when || when < filters.dateFrom)) return false;
    if (filters.dateTo && (!when || when > filters.dateTo)) return false;
    const count = o.publishedPhotos;
    if (filters.photos !== 'all') {
      if (count === null) return false;
      if (filters.photos === 'zero' && count !== 0) return false;
      if (filters.photos === '1-10' && (count < 1 || count > 10)) return false;
      if (filters.photos === '11-25' && (count < 11 || count > 25)) return false;
      if (filters.photos === '26+' && count < 26) return false;
    }
    return true;
  });
}
export function sortOrders(
  orders: readonly GalleryOrder[],
  key: SortKey,
  descending: boolean,
): GalleryOrder[] {
  const dir = descending ? -1 : 1;
  return [...orders].sort((a, b) => {
    const av = a[key],
      bv = b[key];
    if (av === null && bv !== null) return 1;
    if (bv === null && av !== null) return -1;
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR', {
            numeric: true,
            sensitivity: 'base',
          });
    return cmp === 0 ? b.orderId - a.orderId : cmp * dir;
  });
}
export function summarize(orders: readonly GalleryOrder[]) {
  const states = Object.fromEntries(Object.keys(STATES).map((s) => [s, 0])) as Record<
    GalleryState,
    number
  >;
  for (const o of orders) states[o.state]++;
  return { total: orders.length, pending: orders.filter((o) => isPending(o.state)).length, states };
}
export function formatDate(value: string | null): string {
  if (!value) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}
export function priority(
  o: GalleryOrder,
  asOfDay: string,
): 'waiting' | 'attention' | 'ready' | 'unknown' {
  if (o.state === 'unavailable') return 'unknown';
  if (!isPending(o.state)) return 'ready';
  if (o.sessionAt && dateOnly(o.sessionAt) > asOfDay) return 'waiting';
  return 'attention';
}
function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  const hardened = /^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${hardened.replaceAll('"', '""')}"`;
}
/** Client-side CSV is for synthetic local preview only. Production export requires server-side authorization. */
export function syntheticCsv(orders: readonly GalleryOrder[]): string {
  const columns = [
    'Pedido',
    'Cliente',
    'Pacote',
    'Status CRM',
    'Situação Gameplay',
    'Sessão',
    'Primeiro upload',
    'Publicação',
    'Fotos publicadas',
    'Fotos em preparo',
  ];
  const rows = orders.map((o) => [
    o.orderId,
    o.clientName,
    o.packageName,
    o.crmStatus,
    STATES[o.state].label,
    formatDate(o.sessionAt),
    formatDate(o.firstUploadAt),
    formatDate(o.publishedAt),
    o.publishedPhotos,
    o.preparingPhotos,
  ]);
  return '\uFEFF' + [columns, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}
