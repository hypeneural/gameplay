import type { GalleryOrder } from './domain.js';
import React from 'react';
function Icon({name}:{name:'crm'|'gallery'|'game'}) {
  const routes = {
    crm:'M14 4h6v6 M20 4l-10 10 M20 14v6H4V4h6',
    gallery:'M4 4h16v16H4z M7 15l4-4 3 3 2-2 4 4',
    game:'M6 10h12l3 6c1 4-2 5-4 2l-2-2H9l-2 2c-2 3-5 2-4-2l3-6z',
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d={routes[name]}/></svg>;
}
export function Actions({ row, demo, linksEnabled }:{row:GalleryOrder;demo:boolean;linksEnabled:boolean}) {
  const crm = !demo && row.crmOrderUrl?.startsWith('https://evydencia.com/gestao/pedidos/') ? row.crmOrderUrl : null;
  const published = !demo && linksEnabled && row.state === 'published_unverified';
  const href = (kind:'gallery'|'hub') => '/gestao/galerias/api/orders/'+row.orderId+'/open/'+kind;
  return <div className="quick-actions" aria-label={'Ações do pedido '+row.orderId}>
    {crm ? <a className="icon-action" href={crm} target="_blank" rel="noopener noreferrer" title="Abrir pedido no CRM" aria-label="Abrir pedido no CRM"><Icon name="crm"/></a>
      : <button className="icon-action" disabled title="CRM indisponível" aria-label="CRM indisponível"><Icon name="crm"/></button>}
    {published ? <a className="icon-action" href={href('gallery')} target="_blank" rel="noopener noreferrer" title="Abrir galeria após autorização individual" aria-label="Abrir galeria"><Icon name="gallery"/></a>
      : <button className="icon-action" disabled title="Galeria ainda não disponível" aria-label="Galeria indisponível"><Icon name="gallery"/></button>}
    {published ? <a className="icon-action" href={href('hub')} target="_blank" rel="noopener noreferrer" title="Abrir hub de jogos após autorização individual" aria-label="Abrir jogos"><Icon name="game"/></a>
      : <button className="icon-action" disabled title="Jogos ainda não disponíveis" aria-label="Jogos indisponíveis"><Icon name="game"/></button>}
  </div>;
}
