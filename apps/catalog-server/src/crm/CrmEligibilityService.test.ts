import { describe, expect, it, vi } from 'vitest';
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

  it('rejects an eligibility record whose order UUID differs from the requested order', async () => {
    const requested = '11111111-1111-4111-8111-111111111111';
    const network = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          orderUuid: '22222222-2222-4222-8222-222222222222',
          status: 'CONFIRMED',
          isEligibleForGallery: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    try {
      const client = new HttpCrmClient({
        crmEndpointUrl: 'https://crm.example.test',
        apiSecret: 'test-secret-for-crm',
      });
      await expect(client.verifyEligibility(requested)).rejects.toThrow(
        'Invalid response payload from CRM eligibility endpoint',
      );
      expect(network.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' });
    } finally {
      network.mockRestore();
    }
  });

  it('rejects insecure remote CRM origins and invalid timeout bounds', () => {
    expect(
      () =>
        new HttpCrmClient({
          crmEndpointUrl: 'http://external.example.test',
          apiSecret: 'secret',
        }),
    ).toThrow('CRM_ELIGIBILITY_ORIGIN_INVALID');
    expect(
      () =>
        new HttpCrmClient({
          crmEndpointUrl: 'https://crm.example.test',
          apiSecret: 'secret',
          timeoutMs: 0,
        }),
    ).toThrow('CRM_ELIGIBILITY_TIMEOUT_INVALID');
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

  it('supports Laravel CRM /api/orders/{uuid}/detail contract with SingleAuthentication header and official OrderStatus IDs', async () => {
    const orderUuid = '682dfedd-c32c-4f67-9e13-70331810228e';
    const customerUuid = '0f7c9f5d-cb4f-45f1-b6b4-111111111111';
    const network = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 4849,
            uuid: orderUuid,
            status: { id: 7, name: 'Sessão Finalizada' },
            customer: { id: 10, uuid: customerUuid, name: 'Tabata Mousquer' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    try {
      const client = new HttpCrmClient({
        crmEndpointUrl: 'https://api.evydencia.com',
        apiSecret: 'exact-laravel-single-auth-token',
        endpointStyle: 'laravel-detail',
      });
      const result = await client.verifyEligibility(orderUuid);
      expect(result).toEqual({
        orderUuid,
        customerUuid,
        status: 'CONFIRMED',
        isEligibleForGallery: true,
        revoked: false,
        allowSocialCoverPublishing: false,
      });
      expect(network).toHaveBeenCalledWith(
        `https://api.evydencia.com/api/orders/${orderUuid}/detail`,
        expect.objectContaining({
          method: 'GET',
          redirect: 'error',
          headers: expect.objectContaining({
            Authorization: 'exact-laravel-single-auth-token',
          }),
        }),
      );
    } finally {
      network.mockRestore();
    }
  });

  it('maps Laravel cancelled/chargeback/refunded statuses (1, 2, 13) to revoked and waiting_payment (4) to not eligible', async () => {
    const orderUuid = '682dfedd-c32c-4f67-9e13-70331810228e';
    const client = new HttpCrmClient({
      crmEndpointUrl: 'https://api.evydencia.com',
      apiSecret: 'exact-laravel-single-auth-token',
      endpointStyle: 'laravel-detail',
    });

    for (const statusId of [1, 2, 13]) {
      const network = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uuid: orderUuid,
            status: { id: statusId, name: 'Cancelado' },
            social_cover_consent: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
      try {
        const result = await client.verifyEligibility(orderUuid);
        expect(result).toEqual({
          orderUuid,
          status: 'CANCELLED',
          isEligibleForGallery: false,
          revoked: true,
          allowSocialCoverPublishing: false,
        });
      } finally {
        network.mockRestore();
      }
    }

    const waitingNetwork = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          uuid: orderUuid,
          status: { id: 4, name: 'Aguardando Pagamento' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    try {
      const waitingResult = await client.verifyEligibility(orderUuid);
      expect(waitingResult).toEqual({
        orderUuid,
        status: 'CANCELLED',
        isEligibleForGallery: false,
        revoked: false,
        allowSocialCoverPublishing: false,
      });
    } finally {
      waitingNetwork.mockRestore();
    }
  });
});
