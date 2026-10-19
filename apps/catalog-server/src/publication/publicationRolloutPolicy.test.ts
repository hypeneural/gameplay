import { describe, expect, it } from 'vitest';
import { resolvePublicationOrderPolicy } from './publicationRolloutPolicy.js';

const GOOD_UUID = '085881f7-47ec-4344-8296-54dea21b278a';
const OTHER_UUID = '11111111-1111-4111-8111-111111111111';

const ready = {
  releaseStage: 'staging-demo' as const,
  previewAuthority: 'sqlite' as const,
  crmEligibilityOrigin: 'https://evydencia.com/',
  crmApiSecret: 'test-only-secret',
  publisherApiSecret: 'publisher-test-only-secret',
  serverSecret: 'server-test-only-secret',
  databasePath: '/tmp/catalog.db',
  storageDir: '/tmp/catalog-private-media',
};
const requested: NodeJS.ProcessEnv = {
  CATALOG_CUSTOMER_DATA_ALLOWED: '1',
  CATALOG_CUSTOMER_RELEASE_ENABLED: '1',
  CATALOG_CUSTOMER_RELEASE_ACK: 'AUTORIZO_APENAS_PEDIDOS_ELEGIVEIS_CRM',
};

describe('publication customer rollout', () => {
  it('defaults to fail-closed with no pilot and no customer rollout', () => {
    const result = resolvePublicationOrderPolicy(ready, {}, 'production');
    expect(result.mode).toBe('disabled');
    expect(result.isAllowed(GOOD_UUID)).toBe(false);
  });

  it('preserves exact single-pilot behavior, never allowing wildcard', () => {
    const base = {CATALOG_CUSTOMER_PILOT_ENABLED:'1', CATALOG_CUSTOMER_DATA_ALLOWED:'1'};
    expect(resolvePublicationOrderPolicy(ready, {...base,CATALOG_PILOT_ORDER_UUID:GOOD_UUID}, 'production')
      .isAllowed(GOOD_UUID)).toBe(true);
    expect(resolvePublicationOrderPolicy(ready, {...base,CATALOG_PILOT_ORDER_UUID:GOOD_UUID}, 'production')
      .isAllowed(OTHER_UUID)).toBe(false);
    expect(resolvePublicationOrderPolicy(ready, {...base,CATALOG_PILOT_ORDER_UUID:'*'}, 'production')
      .isAllowed(GOOD_UUID)).toBe(false);
  });

  it('requires explicit ACK and all private publication dependencies', () => {
    expect(() => resolvePublicationOrderPolicy(ready, {...requested,CATALOG_CUSTOMER_RELEASE_ACK:''}, 'production'))
      .toThrow('CATALOG_CUSTOMER_RELEASE_PREREQUISITES_MISSING');
    expect(() => resolvePublicationOrderPolicy({...ready,crmApiSecret:undefined}, requested, 'production'))
      .toThrow('CATALOG_CUSTOMER_RELEASE_PREREQUISITES_MISSING');
    expect(() => resolvePublicationOrderPolicy({...ready,previewAuthority:'file-demo'}, requested, 'production'))
      .toThrow('CATALOG_CUSTOMER_RELEASE_PREREQUISITES_MISSING');
    expect(() => resolvePublicationOrderPolicy({...ready,storageDir:undefined}, requested, 'production'))
      .toThrow('CATALOG_CUSTOMER_RELEASE_PREREQUISITES_MISSING');
  });

  it('allows valid UUIDs only with explicit production CRM authorization gate', () => {
    const result = resolvePublicationOrderPolicy(ready, requested, 'production');
    expect(result.mode).toBe('crm-eligible-rollout');
    expect(result.isAllowed(GOOD_UUID)).toBe(true);
    expect(result.isAllowed(OTHER_UUID)).toBe(true);
    expect(result.isAllowed('*')).toBe(false);
    expect(result.isAllowed('not-a-uuid')).toBe(false);
    expect(() => resolvePublicationOrderPolicy(ready, requested, 'development'))
      .toThrow('CATALOG_CUSTOMER_RELEASE_PREREQUISITES_MISSING');
  });

  it('rejects stale rollout acknowledgments with release off', () => {
    expect(() => resolvePublicationOrderPolicy(ready, {CATALOG_CUSTOMER_RELEASE_ACK:requested.CATALOG_CUSTOMER_RELEASE_ACK}, 'production'))
      .toThrow('CATALOG_CUSTOMER_RELEASE_ACK_WITHOUT_ENABLE');
  });
});
