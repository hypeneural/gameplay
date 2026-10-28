import { useEffect, useMemo, useState } from 'react';
import { STATES } from './domain.js';
import type { GalleryOrder } from './domain.js';
import { fixtureOrders } from './fixtures.js';

export interface LiveDashboard {
  orders: GalleryOrder[];
  loading: boolean;
  error: string;
  asOf: string;
  degraded: boolean;
  linksEnabled: boolean;
  reload: () => void;
}
const demo = import.meta.env.DEV;
export function validateDashboard(value: unknown): {
  items: GalleryOrder[];
  as_of: string;
  degraded: boolean;
  links_enabled: boolean;
} {
  if (!value || typeof value !== 'object') throw Error('Resposta administrativa inválida.');
  const v = value as Record<string, unknown>;
  if (v.schema_version !== 1 || v.source !== 'gallery_ops_authenticated_join'
      || !Array.isArray(v.items) || !Number.isSafeInteger(v.total_valid)
      || v.items.length !== v.total_valid || typeof v.as_of !== 'string') {
    throw Error('Divergência na população comercial válida.');
  }
  const ids = new Set<number>();
  for (const entry of v.items) {
    if (!entry || typeof entry !== 'object') throw Error('Registro administrativo inválido.');
    const row = entry as GalleryOrder;
    if (!Number.isSafeInteger(row.orderId) || ids.has(row.orderId)
        || typeof row.clientName !== 'string' || !Object.hasOwn(STATES, row.state)
        || (row.publishedPhotos !== null && !Number.isSafeInteger(row.publishedPhotos))) {
      throw Error('Registros duplicados ou incompletos.');
    }
    ids.add(row.orderId);
  }
  return { items: v.items as GalleryOrder[], as_of: v.as_of, degraded:v.degraded === true, links_enabled:v.links_enabled === true };
}
export function useLiveOrders(): LiveDashboard {
  const fixtures = useMemo(() => demo ? fixtureOrders() : [], []);
  const [rows, setRows] = useState<GalleryOrder[]>([]);
  const [nonce, setNonce] = useState(0);
  const [info, setInfo] = useState({ loading:!demo, error:'', asOf:'', degraded:false, linksEnabled:false });
  useEffect(() => {
    if (demo) return;
    const abort = new AbortController();
    setInfo(v => ({ ...v, loading: true, error: '' }));
    fetch('/gestao/galerias/api/orders', {
      credentials: 'same-origin', cache:'no-store', signal:abort.signal,
    }).then(async response => {
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw Error('Acesso administrativo negado. Entre com a conta autorizada.');
        throw Error('Serviços CRM/Gameplay temporariamente indisponíveis.');
      }
      const data = validateDashboard(await response.json());
      if (abort.signal.aborted) return;
      setRows(data.items);
      setInfo({loading:false,error:'',asOf:data.as_of,degraded:data.degraded,linksEnabled:data.links_enabled});
    }).catch((e:unknown) => {
      if (abort.signal.aborted) return;
      setRows([]);
      setInfo({loading:false,error:e instanceof Error ? e.message : 'Falha de sincronização.',asOf:'',degraded:false,linksEnabled:false});
    });
    return () => abort.abort();
  }, [nonce]);
  return { ...info, orders:demo ? fixtures : rows, reload:()=>setNonce(v=>v+1) };
}
