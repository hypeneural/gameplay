import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  EMPTY_FILTERS,
  STATES,
  filterOrders,
  formatDate,
  formatPhone,
  formatCrmStatus,
  priority,
  operationalStage,
  OPERATIONAL_LABELS,
  sortOrders,
  summarize,
  syntheticCsv,
} from './domain.js';
import type { DateField, GalleryFilters, GalleryState, SortKey, StateFilter } from './domain.js';
import { useLiveOrders } from './useLiveOrders.js';
import { Actions } from './Actions.js';
import './styles.css';

type IconName =
  | 'grid'
  | 'image'
  | 'search'
  | 'refresh'
  | 'filter'
  | 'download'
  | 'calendar'
  | 'chevron'
  | 'external'
  | 'game'
  | 'alert'
  | 'check'
  | 'lock'
  | 'close'
  | 'clock';
const iconPaths: Record<IconName, string> = {
  grid: 'M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z',
  image: 'M4 4h16v16H4z M7 15l4-4 3 3 2-2 4 4 M8 8h.01',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z M21 21l-4.3-4.3',
  refresh: 'M20 11a8 8 0 0 0-14-5L3 9 M3 3v6h6 M4 13a8 8 0 0 0 14 5l3-3 M21 21v-6h-6',
  filter: 'M4 7h16 M7 12h10 M10 17h4',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
  chevron: 'M7 10l5 5 5-5',
  external: 'M13 5h6v6 M19 5l-9 9 M19 13v6H5V5h6',
  game: 'M6 10h12l3 6c1 4-2 5-4 2l-2-2H9l-2 2c-2 3-5 2-4-2l3-6z M8 12v4 M6 14h4 M16 13h.01 M18 15h.01',
  alert: 'M12 3l10 18H2L12 3z M12 9v5 M12 17h.01',
  check: 'M4 12l5 5L20 6',
  lock: 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3',
  close: 'M5 5l14 14 M19 5L5 19',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
};
function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
const INITIAL_SORT: SortKey = 'operationalPriority';
const stateOptions: { id: StateFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendências reais' },
  { id: 'follow_up', label: 'Acompanhar produção' },
  { id: 'awaiting_session', label: 'Aguardando sessão' },
  { id: 'no_session', label: 'Sem sessão' },
  { id: 'no_upload', label: 'Sem publicação' },
  { id: 'preparing', label: 'Em preparação' },
  { id: 'incomplete', label: 'Incompleta' },
  { id: 'published_unverified', label: 'Publicadas · link individual' },
  { id: 'revoked', label: 'Revogadas' },
  { id: 'unavailable', label: 'Falha de integração' },
];
const dateFieldOptions: { value: DateField; label: string }[] = [
  { value: 'sessionAt', label: 'Data da sessão' },
  { value: 'createdAt', label: 'Criação do pedido' },
  { value: 'firstUploadAt', label: 'Primeiro upload' },
  { value: 'publishedAt', label: 'Publicação' },
];
const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'operationalPriority', label: 'Prioridade operacional' },
  { value: 'sessionAt', label: 'Data da sessão' },
  { value: 'orderId', label: 'Número do pedido' },
  { value: 'clientName', label: 'Nome do cliente' },
  { value: 'clientWhatsapp', label: 'WhatsApp do cliente' },
  { value: 'packageName', label: 'Pacote' },
  { value: 'createdAt', label: 'Criação do pedido' },
  { value: 'firstUploadAt', label: 'Primeiro upload' },
  { value: 'publishedAt', label: 'Publicação' },
  { value: 'publishedPhotos', label: 'Fotos publicadas' },
  { value: 'state', label: 'Situação' },
];
const DEMO_DATE = '2026-10-28';
const localDemo = import.meta.env.DEV;
function ClientContact({
  row,
}: {
  row: { clientWhatsapp: string | null; clientPhone: string | null; clientEmail: string | null };
}) {
  const wa = formatPhone(row.clientWhatsapp);
  const phone = formatPhone(row.clientPhone);
  return (
    <div className="client-contacts">
      {row.clientWhatsapp && <span title="WhatsApp cadastrado no CRM">WhatsApp: {wa}</span>}
      {row.clientPhone && row.clientPhone !== row.clientWhatsapp && (
        <span title="Telefone alternativo">Tel.: {phone}</span>
      )}
      {row.clientEmail && (
        <span className="client-email" title="E-mail cadastrado">
          {row.clientEmail}
        </span>
      )}
      {!row.clientWhatsapp && !row.clientPhone && !row.clientEmail && (
        <span>Sem contato cadastrado</span>
      )}
    </div>
  );
}
function Status({ state }: { state: GalleryState }) {
  return (
    <span className={'status status--' + STATES[state].tone} title={STATES[state].description}>
      <span className="status-dot" />
      {STATES[state].label}
    </span>
  );
}

function Indicator({
  label,
  count,
  icon,
  active,
  onClick,
  tone,
}: {
  label: string;
  count: number | string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'indicator ' + (active ? 'indicator--active ' : '') + (tone ? 'indicator--' + tone : '')
      }
      aria-pressed={active}
    >
      <span className="indicator-head">
        <span>{label}</span>
        <Icon name={icon} size={18} />
      </span>
      <span className="indicator-number">{count}</span>
      <span className="indicator-foot">Clique para filtrar</span>
    </button>
  );
}
function App() {
  const [filters, setFilters] = useState<GalleryFilters>({ ...EMPTY_FILTERS, state: 'pending' });
  const [sortBy, setSortBy] = useState<SortKey>(INITIAL_SORT);
  const [descending, setDescending] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [exportMessage, setExportMessage] = useState('');
  const live = useLiveOrders();
  const records = live.orders;
  const loaded = localDemo || (!live.loading && !live.error);
  const summary = useMemo(() => summarize(records), [records]);
  const filtered = useMemo(() => filterOrders(records, filters), [records, filters]);
  const sorted = useMemo(
    () => sortOrders(filtered, sortBy, descending),
    [filtered, sortBy, descending],
  );
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const update = <K extends keyof GalleryFilters>(key: K, value: GalleryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setExportMessage('');
  };
  const setState = (state: StateFilter) => update('state', state);
  const reset = () => {
    setFilters({ ...EMPTY_FILTERS });
    setSortBy(INITIAL_SORT);
    setDescending(false);
    setPage(1);
    setExportMessage('');
  };
  const packageNames = [...new Set(records.map((r) => r.packageName))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
  const crmStatuses = [...new Set(records.map((r) => r.crmStatus))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
  const hasAdvanced =
    filters.packageName !== 'all' ||
    filters.crmStatus !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.photos !== 'all';
  const exportSynthetic = () => {
    if (!loaded || !sorted.length) return;
    if (!localDemo) {
      window.location.assign('/gestao/galerias/api/export');
      setExportMessage('Exportação completa de pedidos válidos solicitada ao servidor.');
      return;
    }
    const blob = new Blob([syntheticCsv(sorted)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'galerias-natal26-DADOS-FICTICIOS.csv';
    link.click();
    URL.revokeObjectURL(url);
    setExportMessage('CSV fictício gerado somente neste navegador. Sem dados do CRM.');
  };
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navegação da gestão">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div>
            <strong>Evydência</strong>
            <span>PAINEL OPERACIONAL</span>
          </div>
        </div>
        <div className="nav-section">NATAL 2026</div>
        <div className="nav-active">
          <Icon name="grid" size={18} /> Galerias <span className="nav-count">2026</span>
        </div>
        <div className="sidebar-bottom">
          <Icon name="lock" size={17} />
          <div>
            <strong>Área administrativa</strong>
            <small>{localDemo ? 'Somente dados sintéticos' : 'Acesso administrativo autenticado'}</small>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="crumb">
            Gestão <span>/</span> Natal 2026 <span>/</span> <strong>Galerias</strong>
          </div>
          <span className="head-environment">
            <span className="pulse" />
            {localDemo ? 'Visualização sintética' : loaded ? 'Operação conectada' : 'Verificando integração'}
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CENTRAL DE OPERAÇÕES · 2026</div>
              <h1>Operação de Galerias</h1>
              <p>Identifique pendências e acompanhe a preparação das experiências digitais.</p>
            </div>
            <div className="meta">
              <span>
                <Icon name="calendar" size={16} /> Corte de referência: 28/10/2026
              </span>
              <span>
                <Icon name="clock" size={16} />{' '}
                {localDemo
                  ? 'Simulação local'
                  : live.asOf
                    ? 'Corte CRM: ' + live.asOf
                    : 'Corte indisponível'}
              </span>
            </div>
          </div>
          <div
            className={'notice ' + (localDemo || (loaded && !live.degraded) ? '' : 'notice--error')}
            role="status"
          >
            <Icon name={localDemo ? 'alert' : 'lock'} size={20} />
            <div>
              <strong>
                {localDemo
                  ? 'Prévia de interface — dados 100% fictícios'
                  : live.loading
                    ? 'Carregando pedidos válidos…'
                    : live.error
                      ? 'Falha de consulta administrativa'
                      : live.degraded
                        ? 'Gameplay parcialmente indisponível'
                        : 'Dados administrativos sincronizados'}
              </strong>
              <span>
                {localDemo
                  ? 'Nenhum nome, pedido ou link representa uma família real. Os indicadores abaixo são demonstrativos.'
                  : live.loading
                    ? 'Consultando a população comercial canônica e suas galerias.'
                    : live.error
                      ? live.error
                      : live.degraded
                        ? 'Os pedidos permanecem visíveis; os lotes sem resposta aparecem como integração indisponível.'
                        : 'CRM e Gameplay consultados com autenticação. A disponibilidade dos links é verificada individualmente.'}
              </span>
            </div>
          </div>
          <div className="section-heading">
            <h2>Visão geral</h2>
            <span>
              Indicadores do conjunto completo{' '}
              {localDemo ? '(48 registros fictícios)' : loaded ? '(' + summary.total + ' pedidos válidos)' : '(carregando)'}
            </span>
          </div>
          <div className="indicators">
            <Indicator
              label="Pedidos válidos"
              count={loaded ? summary.total : '—'}
              icon="grid"
              active={filters.state === 'all'}
              onClick={() => setState('all')}
            />
            <Indicator
              label="Pendências reais"
              count={loaded ? summary.pending : '—'}
              icon="alert"
              tone="amber"
              active={filters.state === 'pending'}
              onClick={() => setState('pending')}
            />
            <Indicator
              label="Acompanhar produção"
              count={loaded ? summary.followUp : '—'}
              icon="clock"
              active={filters.state === 'follow_up'}
              onClick={() => setState('follow_up')}
            />
            <Indicator
              label="Aguardando sessão"
              count={loaded ? summary.awaiting : '—'}
              icon="calendar"
              active={filters.state === 'awaiting_session'}
              onClick={() => setState('awaiting_session')}
            />
            <Indicator
              label="Publicadas*"
              count={loaded ? summary.published : '—'}
              icon="check"
              tone="green"
              active={filters.state === 'published_unverified'}
              onClick={() => setState('published_unverified')}
            />
            <Indicator
              label="Integração indisponível"
              count={loaded ? summary.states.unavailable : '—'}
              icon="alert"
              tone="red"
              active={filters.state === 'unavailable'}
              onClick={() => setState('unavailable')}
            />
          </div>
          <div className="indicators-note">
            A fila urgente contém apenas pedidos comercialmente avançados (retirada/conclusão) sem publicação.
            Os outros pedidos seguem em acompanhamento, sem serem contabilizados como atraso.
            * Publicação no catálogo não comprova o funcionamento dos jogos no navegador.
          </div>
          <section className="workspace" aria-label="Lista de pedidos">
            <div className="workspace-top">
              <div>
                <h2>Fila de galerias</h2>
                <p>Prioridade automática: retirada e pedidos concluídos sem publicação. Demais pedidos ficam em acompanhamento.</p>
              </div>
              <div className="toolbar">
                {!localDemo && (
                  <button
                    className="btn btn--ghost"
                    type="button"
                    disabled={live.loading}
                    onClick={live.reload}
                  >
                    <Icon name="refresh" size={17} /> Atualizar dados
                  </button>
                )}
                <button className="btn btn--ghost" type="button" onClick={reset}>
                  <Icon name="refresh" size={17} /> Limpar
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  aria-expanded={filtersOpen}
                >
                  <Icon name="filter" size={17} /> Filtros {hasAdvanced ? '•' : ''}
                </button>
                <button
                  className="btn btn--primary"
                  type="button"
                  disabled={!loaded || sorted.length === 0}
                  onClick={exportSynthetic}
                >
                  <Icon name="download" size={17} /> Exportar CSV
                </button>
              </div>
            </div>
            <div className="searchbar">
              <div className="search-field">
                <Icon name="search" size={18} />
                <label className="sr-only" htmlFor="search">
                  Buscar pedido ou cliente
                </label>
                <input
                  id="search"
                  type="search"
                  placeholder="Buscar pedido, nome, WhatsApp ou e-mail..."
                  value={filters.search}
                  onChange={(e) => update('search', e.target.value)}
                />
              </div>
              <div className="quick-tabs" aria-label="Filtrar por situação">
                {stateOptions.filter((t) => ['all','pending','follow_up','awaiting_session','published_unverified'].includes(t.id)).map((t) => (
                  <button
                    key={t.id}
                    className={'tab ' + (filters.state === t.id ? 'tab--active' : '')}
                    aria-pressed={filters.state === t.id}
                    onClick={() => setState(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {filtersOpen && (
              <div className="advanced" aria-label="Filtros avançados">
                <label>
                  Estado da galeria
                  <select
                    value={filters.state}
                    onChange={(e) => setState(e.target.value as StateFilter)}
                  >
                    {stateOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Pacote
                  <select
                    value={filters.packageName}
                    onChange={(e) => update('packageName', e.target.value)}
                  >
                    <option value="all">Todos os pacotes</option>
                    {packageNames.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Etapa do CRM
                  <select
                    value={filters.crmStatus}
                    onChange={(e) => update('crmStatus', e.target.value)}
                  >
                    <option value="all">Todas as etapas</option>
                    {crmStatuses.map((s) => (
                      <option key={s} value={s}>
                        {formatCrmStatus(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo de data
                  <select
                    value={filters.dateField}
                    onChange={(e) => update('dateField', e.target.value as DateField)}
                  >
                    {dateFieldOptions.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  De
                  <input
                    type="date"
                    value={filters.dateFrom}
                    max={filters.dateTo || undefined}
                    onChange={(e) => update('dateFrom', e.target.value)}
                  />
                </label>
                <label>
                  Até
                  <input
                    type="date"
                    value={filters.dateTo}
                    min={filters.dateFrom || undefined}
                    onChange={(e) => update('dateTo', e.target.value)}
                  />
                </label>
                <label>
                  Fotos publicadas
                  <select
                    value={filters.photos}
                    onChange={(e) => update('photos', e.target.value as GalleryFilters['photos'])}
                  >
                    <option value="all">Qualquer quantidade</option>
                    <option value="zero">0 fotos</option>
                    <option value="1-10">1 a 10</option>
                    <option value="11-25">11 a 25</option>
                    <option value="26+">26 ou mais</option>
                  </select>
                </label>
                <div className="advanced-actions">
                  <button type="button" onClick={reset} className="text-btn">
                    Limpar todos os filtros <Icon name="close" size={14} />
                  </button>
                </div>
              </div>
            )}
            <div className="result-head">
              <div>
                <strong>{sorted.length}</strong> pedidos{' '}
                {filters.state === 'pending' ? 'com publicação urgente' : 'encontrados'}{' '}
                <span>
                  ·{' '}
                  {localDemo
                    ? 'Dados fictícios'
                    : live.degraded
                      ? 'Gameplay parcialmente indisponível'
                      : 'Pedidos sincronizados'}
                </span>
              </div>
              <div className="sort-controls">
                <label htmlFor="sort">Ordenar por</label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortKey);
                    setPage(1);
                  }}
                >
                  {sortOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="direction"
                  title={descending ? 'Ordem decrescente' : 'Ordem crescente'}
                  aria-label={descending ? 'Ordenar decrescente' : 'Ordenar crescente'}
                  onClick={() => {
                    setDescending((v) => !v);
                    setPage(1);
                  }}
                >
                  {descending ? '↓' : '↑'}
                </button>
              </div>
            </div>
            {exportMessage && (
              <div className="export-confirm" role="status">
                {exportMessage}
              </div>
            )}
            {sorted.length === 0 ? (
              <div className="empty">
                <Icon name={localDemo ? 'search' : 'lock'} size={30} />
                <h3>
                  {loaded
                    ? 'Nenhum pedido com esses filtros'
                    : 'Dados administrativos indisponíveis'}
                </h3>
                <p>
                  {loaded
                    ? 'Altere os filtros ou volte à lista completa.'
                    : 'Acesso a registros reais exige autenticação e integração homologada.'}
                </p>
                {loaded && (
                  <button className="btn btn--ghost" type="button" onClick={reset}>
                    Remover filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="table-viewport">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">PEDIDO / CLIENTE / CONTATO</th>
                        <th scope="col">PACOTE / CRM</th>
                        <th scope="col">DATA DA SESSÃO</th>
                        <th scope="col">GALERIA</th>
                        <th scope="col">FOTOS</th>
                        <th scope="col">PUBLICAÇÃO</th>
                        <th scope="col">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((o) => (
                        <tr key={o.orderId}>
                          <td>
                            <strong className="order-id">#{o.orderId}</strong>
                            <div className="client-name">{o.clientName}</div>
                            <ClientContact row={o} />
                            <small className="order-created">
                              Pedido: {formatDate(o.createdAt)}
                            </small>
                          </td>
                          <td>
                            <span className="package">{o.packageName}</span>
                            <small className="crm-status">{formatCrmStatus(o.crmStatus)}</small>
                            <span className={'operational-chip operational-chip--'+operationalStage(o)}>{OPERATIONAL_LABELS[operationalStage(o)]}</span>
                          </td>
                          <td>
                            <span className="date">{formatDate(o.sessionAt)}</span>
                            <small
                              className={
                                'priority priority--' +
                                priority(o, localDemo ? DEMO_DATE : live.asOf.slice(0, 10))
                              }
                            >
                              {priority(o, localDemo ? DEMO_DATE : live.asOf.slice(0, 10)) ===
                              'waiting'
                                ? 'Sessão futura'
                                : priority(o, localDemo ? DEMO_DATE : live.asOf.slice(0, 10)) ===
                                    'attention'
                                  ? 'Publicação urgente'
                                  : priority(o, localDemo ? DEMO_DATE : live.asOf.slice(0, 10)) ===
                                      'unknown'
                                    ? 'Acompanhar etapa'
                                    : 'Catálogo preparado'}
                            </small>
                          </td>
                          <td>
                            <Status state={o.state} />
                          </td>
                          <td>
                            <strong>{o.publishedPhotos === null ? '—' : o.publishedPhotos}</strong>
                            <small className="count-note">
                              {o.preparingPhotos
                                ? `+${o.preparingPhotos} em preparo`
                                : 'publicadas'}
                            </small>
                          </td>
                          <td>
                            <span className="date">{formatDate(o.publishedAt)}</span>
                            <small className="crm-status">
                              Upload: {formatDate(o.firstUploadAt)}
                            </small>
                          </td>
                          <td>
                            <Actions row={o} demo={localDemo} linksEnabled={live.linksEnabled} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mobile-records">
                  {visible.map((o) => (
                    <article className="mobile-record" key={o.orderId}>
                      <div className="mobile-record-head">
                        <div>
                          <strong>#{o.orderId}</strong>
                          <span>{o.clientName}</span>
                          <ClientContact row={o} />
                          <small>{o.packageName}</small>
                          <span className={'operational-chip operational-chip--'+operationalStage(o)}>{OPERATIONAL_LABELS[operationalStage(o)]}</span>
                          <small>Pedido criado: {formatDate(o.createdAt)}</small>
                        </div>
                        <Status state={o.state} />
                      </div>
                      <div className="mobile-metrics">
                        <div>
                          <label>Sessão</label>
                          <strong>{formatDate(o.sessionAt)}</strong>
                        </div>
                        <div>
                          <label>Fotos</label>
                          <strong>{o.publishedPhotos ?? '—'}</strong>
                        </div>
                        <div>
                          <label>Publicação</label>
                          <strong>{formatDate(o.publishedAt)}</strong>
                        </div>
                      </div>
                      <div className="mobile-record-foot">
                        <small>
                          {formatCrmStatus(o.crmStatus)} ·{' '}
                          {o.preparingPhotos
                            ? o.preparingPhotos + ' em preparação'
                            : 'Sem preparo ativo'}
                        </small>
                        <Actions row={o} demo={localDemo} linksEnabled={live.linksEnabled} />
                      </div>
                    </article>
                  ))}
                </div>
                <div className="pagination">
                  <label>
                    Linhas por página{' '}
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                  </label>
                  <span>
                    Página {currentPage} de {pages}
                  </span>
                  <div>
                    <button
                      className="pager"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Página anterior"
                    >
                      ←
                    </button>
                    <button
                      className="pager"
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={currentPage >= pages}
                      aria-label="Próxima página"
                    >
                      →
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
          <footer>
            Estúdio Evydência · Operação de Galerias Natal 2026{' '}
            <span>
              {localDemo
                ? 'Dados 100% sintéticos'
                : 'Consulta privada e autenticada · sem cache público'}
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
const mount = document.getElementById('root');
if (!mount) throw new Error('GALLERY_OPS_ROOT_MISSING');
createRoot(mount).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
