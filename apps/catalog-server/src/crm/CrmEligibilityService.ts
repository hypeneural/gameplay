export interface CrmOrderEligibility {
  readonly orderUuid: string;
  readonly customerUuid?: string;
  readonly status: 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
  readonly isEligibleForGallery: boolean;
  readonly revoked?: boolean;
}

export interface CrmClient {
  verifyEligibility(orderUuid: string): Promise<CrmOrderEligibility>;
}

export class CrmClientError extends Error {
  constructor(
    message: string,
    public readonly isTransient: boolean = false,
  ) {
    super(message);
    this.name = 'CrmClientError';
  }
}

export interface HttpCrmClientOptions {
  readonly crmEndpointUrl: string;
  readonly apiSecret: string;
  readonly timeoutMs?: number;
}

export class HttpCrmClient implements CrmClient {
  private readonly endpoint: string;
  private readonly secret: string;
  private readonly timeoutMs: number;

  constructor(options: HttpCrmClientOptions) {
    if (!options.crmEndpointUrl || !options.apiSecret) {
      throw new Error('HttpCrmClient requires crmEndpointUrl and apiSecret');
    }
    const url = new URL(options.crmEndpointUrl);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('CRM_ELIGIBILITY_ORIGIN_INVALID');
    }
    const timeoutMs = options.timeoutMs ?? 5000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
      throw new Error('CRM_ELIGIBILITY_TIMEOUT_INVALID');
    }
    this.endpoint = url.href.replace(/\/+$/, '');
    this.secret = options.apiSecret;
    this.timeoutMs = timeoutMs;
  }

  async verifyEligibility(orderUuid: string): Promise<CrmOrderEligibility> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.endpoint}/internal/v1/orders/${encodeURIComponent(orderUuid)}/eligibility`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `***          Accept: 'application/json',
          'User-Agent': 'ChristmasGames-CatalogServer/1.0',
        },
        signal: controller.signal,
        redirect: 'error',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new CrmClientError(`Order ${orderUuid} not found in CRM`, false);
        }
        if (response.status >= 500 || response.status === 429) {
          throw new CrmClientError(`CRM returned HTTP ${response.status}`, true);
        }
        throw new CrmClientError(`CRM rejected request with HTTP ${response.status}`, false);
      }

      const body = (await response.json()) as Partial<CrmOrderEligibility>;
      if (
        !body ||
        typeof body.orderUuid !== 'string' ||
        body.orderUuid.toLowerCase() !== orderUuid.toLowerCase() ||
        typeof body.isEligibleForGallery !== 'boolean' ||
        (body.status !== 'CONFIRMED' && body.status !== 'DELIVERED' && body.status !== 'CANCELLED')
      ) {
        throw new CrmClientError('Invalid response payload from CRM eligibility endpoint', false);
      }

      return {
        orderUuid: body.orderUuid,
        ...(typeof body.customerUuid === 'string' ? { customerUuid: body.customerUuid } : {}),
        status: body.status,
        isEligibleForGallery: body.isEligibleForGallery,
        revoked: body.revoked === true,
      };
    } catch (error) {
      if (error instanceof CrmClientError) throw error;
      const isAbort = controller.signal.aborted;
      throw new CrmClientError(
        isAbort ? 'CRM_ELIGIBILITY_TIMEOUT' : 'CRM_ELIGIBILITY_NETWORK_FAILURE',
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class InMemoryCrmClient implements CrmClient {
  private readonly records = new Map<string, CrmOrderEligibility>();

  setEligibility(record: CrmOrderEligibility): void {
    this.records.set(record.orderUuid, record);
  }

  removeEligibility(orderUuid: string): void {
    this.records.delete(orderUuid);
  }

  async verifyEligibility(orderUuid: string): Promise<CrmOrderEligibility> {
    const found = this.records.get(orderUuid);
    if (!found) {
      throw new CrmClientError(`Order ${orderUuid} not found in CRM`, false);
    }
    return found;
  }
}
