import type { GalleryOrder } from './domain.js';

type ActionName = 'crm' | 'gallery' | 'game' | 'lock';
const paths: Record<ActionName, string> = {
  crm: 'M14 4h6v6 M20 4l-10 10 M20 14v6H4V4h6',
  gallery: 'M4 4h16v16H4z M7 15l4-4 3 3 2-2 4 4 M8 8h.01',
  game: 'M6 10h12l3 6c1 4-2 5-4 2l-2-2H9l-2 2c-2 3-5 2-4-2l3-6z M8 12v4 M6 14h4 M16 13h.01 M18 15h.01',
  lock: 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3',
};
function Icon({ name }: { name: ActionName }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
function Action({
  name,
  label,
  href,
  explanation,
}: {
  name: ActionName;
  label: string;
  href: string | null;
  explanation: string;
}) {
  if (!href)
    return (
      <button
        className="icon-action"
        type="button"
        disabled
        title={explanation}
        aria-label={label + ' indisponível: ' + explanation}
      >
        <Icon name={name} />
        <span>{label}</span>
      </button>
    );
  return (
    <a
      className="icon-action icon-action--enabled"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={explanation}
      aria-label={label + ' (consulta individual autorizada)'}
    >
      <Icon name={name} />
      <span>{label}</span>
    </a>
  );
}
export function Actions({
  row,
  demo,
  linksEnabled,
}: {
  row: GalleryOrder;
  demo: boolean;
  linksEnabled: boolean;
}) {
  const crm =
    !demo && row.crmOrderUrl?.startsWith('https://evydencia.com/gestao/pedidos/')
      ? row.crmOrderUrl
      : null;
  const published = row.state === 'published_unverified';
  const allowed = !demo && linksEnabled && published;
  const reason = !published
    ? 'Pedido ainda não tem galeria publicada e válida'
    : !linksEnabled
      ? 'Acesso individual aguardando liberação administrativa'
      : 'Verificar a publicação deste pedido em uma nova aba';
  const href = (kind: 'gallery' | 'hub') =>
    '/gestao/galerias/api/orders/' + row.orderId + '/open/' + kind;
  return (
    <div className="quick-actions" aria-label={'Ações do pedido ' + row.orderId}>
      <Action name="crm" label="CRM" href={crm} explanation="Abrir pedido no CRM (login próprio)" />
      <Action
        name="gallery"
        label="Fotos"
        href={allowed ? href('gallery') : null}
        explanation={reason}
      />
      <Action name="game" label="Jogos" href={allowed ? href('hub') : null} explanation={reason} />
      {published && !allowed && !demo && (
        <small className="actions-status">
          <Icon name="lock" /> Links protegidos
        </small>
      )}
    </div>
  );
}
