import { describe, expect, it } from 'vitest';
import { CrmClientError, HttpCrmClient, InMemoryCrmClient } from './CrmEligibilityService.js';
import type { CrmOrderEligibility } from './CrmEligibilityService.js';

describe('CrmEligibilityService', () => {
  it('InMemoryCrmClient returns eligible record when present', async () => {
    const client = new InMemoryCrmClient();
    const orderUuid = '11111111-1111-4111-8111-111111111111';
    const record: CrmOrderEligibility = {
      orderUuid,
      customerUuid: 'cust-123',
      status: 'CONFIRMED',
      isEligibleForGallery: true,
      revoked: false,
    };
    client.setEligibility(record);

    const result = await client.verifyEligibility(orderUuid);
    expect(result).toEqual(record);
  });

  it('InMemoryCrmClient throws non-transient error when order not found', async () => {
    const client = new InMemoryCrmClient();
    await expect(client.verifyEligibility('unknown-order')).rejects.toThrowError(
      /not found in CRM/,
    );
  });

  it('HttpCrmClient rejects construction with missing endpoint or secret', () => {
    expect(() => new HttpCrmClient({ crmEndpointUrl: '', apiSecret: 'secret' })).toThrowError(
      /requires crmEndpointUrl and apiSecret/,
    );
    expect(
      () => new HttpCrmClient({ crmEndpointUrl: 'http://localhost', apiSecret: '' }),
    ).toThrowError(/requires crmEndpointUrl and apiSecret/);
  });

  it('HttpCrmClient throws transient CrmClientError on network failure', async () => {
    const client = new HttpCrmClient({
      crmEndpointUrl: 'http://127.0.0.1:59999', // Porta improvável de estar aberta
      apiSecret: 'test-secret-12345678',
      timeoutMs: 500,
    });

    try {
      await client.verifyEligibility('11111111-1111-4111-8111-111111111111');
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CrmClientError);
      expect((error as CrmClientError).isTransient).toBe(true);
    }
  });
});
