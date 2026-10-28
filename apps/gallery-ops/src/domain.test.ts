import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  filterOrders,
  formatDate,
  priority,
  projectGameplayState,
  sortOrders,
  summarize,
  syntheticCsv,
} from './domain.js';
import { fixtureOrders } from './fixtures.js';
const items = fixtureOrders();
describe('gallery operations domain (synthetic only)', () => {
  it('distinguishes 503, missing session, staging and publication without browser proof', () => {
    expect(projectGameplayState(null, null, true)).toBe('unavailable');
    expect(projectGameplayState('not_found', null)).toBe('no_session');
    expect(projectGameplayState('not_published', 'staged')).toBe('preparing');
    expect(projectGameplayState('not_published', 'invalid')).toBe('incomplete');
    expect(projectGameplayState('published_unverified', 'none')).toBe('published_unverified');
  });
  it('summarizes the complete universe before applying filters', () => {
    const s = summarize(items);
    expect(s.total).toBe(48);
    expect(Object.values(s.states).reduce((a, b) => a + b, 0)).toBe(48);
    expect(s.states.unavailable).toBeGreaterThan(0);
  });
  it('filters by accent-insensitive client, package, state and date inclusive', () => {
    expect(filterOrders(items, { ...EMPTY_FILTERS, search: 'familia exemplo a' }).length).toBe(6);
    expect(
      filterOrders(items, { ...EMPTY_FILTERS, state: 'pending' }).every(
        (o) => o.state !== 'published_unverified',
      ),
    ).toBe(true);
    expect(
      filterOrders(items, { ...EMPTY_FILTERS, packageName: 'Ho-Ho-Ho' }).every(
        (o) => o.packageName === 'Ho-Ho-Ho',
      ),
    ).toBe(true);
    expect(
      filterOrders(items, {
        ...EMPTY_FILTERS,
        dateField: 'createdAt',
        dateFrom: '2026-10-05',
        dateTo: '2026-10-05',
      }).every((o) => o.createdAt === '2026-10-05'),
    ).toBe(true);
  });
  it('finds authorized customer by digits, WhatsApp formatting or email without partial-page limits', () => {
    const example = items.find(row => row.clientWhatsapp && row.clientEmail)!;
    expect(example).toBeDefined();
    const digits = example.clientWhatsapp!.replace(/\D/g, '');
    expect(filterOrders(items, {...EMPTY_FILTERS, search: digits.slice(-8)}).map(row => row.orderId))
      .toContain(example.orderId);
    expect(filterOrders(items, {...EMPTY_FILTERS, search: example.clientEmail!}).map(row => row.orderId))
      .toContain(example.orderId);
    expect(filterOrders(items, {...EMPTY_FILTERS, search: '#'+example.orderId}).map(row => row.orderId))
      .toContain(example.orderId);
  });
  it('does not assert that a past scheduled session was completed', () => {
    const waiting = {...items[0]!, state:'no_session' as const, crmStatus:'session_schedule',
      sessionAt:'2026-10-10', firstUploadAt:null};
    expect(priority(waiting, '2026-10-28')).toBe('unknown');
    expect(priority({...waiting,crmStatus:'waiting_product_retrieve'},'2026-10-28')).toBe('attention');
    expect(formatDate('2026-10-28T01:30:00Z')).toBe('27/10/2026');
  });
  it('CSV includes contacts but neutralizes formula injection in name and email', () => {
    const row = {...items[0]!, clientName:'=HYPERLINK("bad","open")', clientEmail:'=2+3'};
    const output = syntheticCsv([row]);
    expect(output).toContain('WhatsApp');
    expect(output).toContain('Telefone');
    expect(output).toContain('E-mail');
    expect(output).toContain("'=HYPERLINK");
    expect(output).toContain("'=2+3");
  });
  it('treats unknown photos distinctly from zero', () => {
    expect(
      filterOrders(items, { ...EMPTY_FILTERS, photos: 'zero' }).every(
        (o) => o.publishedPhotos === 0,
      ),
    ).toBe(true);
    expect(
      filterOrders(items, { ...EMPTY_FILTERS, state: 'unavailable', photos: 'zero' }),
    ).toHaveLength(0);
  });
  it('sorts without mutating and keeps unknown dates at end', () => {
    const before = items.map((o) => o.orderId);
    const sorted = sortOrders(items, 'sessionAt', false);
    expect(items.map((o) => o.orderId)).toEqual(before);
    expect(sorted.at(-1)?.sessionAt).toBeNull();
  });
  it('marks future session as waiting rather than overdue', () => {
    const future = { ...items[0]!, sessionAt: '2026-11-04' };
    expect(priority(future, '2026-10-28')).toBe('waiting');
    expect(priority({ ...future, state: 'unavailable' as const }, '2026-10-28')).toBe('unknown');
  });
  it('escapes spreadsheet formulas and quotes in CSV', () => {
    const row = { ...items[0]!, clientName: '=HYPERLINK("bad","open")' };
    const csv = syntheticCsv([row]);
    expect(csv).toContain("'=HYPERLINK(");
    expect(csv).toContain('""bad""');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(formatDate(null)).toBe('—');
  });
});
