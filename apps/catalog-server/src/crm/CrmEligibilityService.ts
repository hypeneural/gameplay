export interface CrmOrderEligibility {
  readonly orderUuid: string;
  readonly customerUuid?: string;
  readonly status: 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
  readonly isEligibleForGallery: boolean;
  readonly revoked?: boolean;
  readonly allowSocialCoverPublishing?: boolean;
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

export type CrmEndpointStyle = 'eligibility' | 'laravel-detail';

export interface HttpCrmClientOptions {
  readonly crmEndpointUrl: string;
  readonly apiSecret: string;
  readonly timeoutMs?: number;
  readonly endpointStyle?: CrmEndpointStyle;
}

interface LaravelOrderDetailPayload {
  readonly uuid?: unknown;
  readonly status?: {
    readonly id?: unknown;
    readonly name?: unknown;
  };
  readonly customer?: {
    readonly uuid?: unknown;
  };
  readonly gallery?: {
    readonly status?: unknown;
    readonly social_cover_consent?: unknown;
  };
  readonly social_cover_consent?: unknown;
  readonly allow_social_cover?: unknown;
}

/**
 * Maps official Evydência CRM `App\Enums\OrderStatus` IDs to Gameplay eligibility.
 * - 1 (order_aborted), 2 (payment_chargeback), 13 (payment_refunded): CANCELLED + revoked
 * - 3 (order_created), 4 (waiting_payment): CANCELLED (not yet eligible) + not revoked
 * - 5..10 (payment_confirmed .. waiting_product_retrieve): CONFIRMED + eligible
 * - 11 (product_retrieve_confirmed), 12 (order_completed): DELIVERED + eligible
 */
function parseLaravelOrderDetail(
  raw: unknown,
  expectedOrderUuid: string,
): CrmOrderEligibility | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const envelope = raw as { data?: unknown } & LaravelOrderDetailPayload;
  const record: LaravelOrderDetailPayload =
    envelope.data && typeof envelope.data === 'object'
      ? (envelope.data as LaravelOrderDetailPayload)
      : envelope;

  if (typeof record.uuid !== 'string') {
    return undefined;
  }
  if (record.uuid.toLowerCase() !== expectedOrderUuid.toLowerCase()) {
    throw new CrmClientError('Invalid response payload from CRM eligibility endpoint', false);
  }

  const statusObj = record.status;
  if (!statusObj || typeof statusObj !== 'object' || typeof statusObj.id !== 'number') {
    throw new CrmClientError('Invalid response payload from CRM eligibility endpoint', false);
  }

  const statusId = statusObj.id;
  const galleryDeleting =
    record.gallery && typeof record.gallery === 'object' && record.gallery.status === 'deleting';

  let status: CrmOrderEligibility['status'];
  let isEligibleForGallery: boolean;
  let revoked: boolean;

  if (statusId === 1 || statusId === 2 || statusId === 13 || galleryDeleting) {
    status = 'CANCELLED';
    isEligibleForGallery = false;
    revoked = true;
  } else if (statusId === 3 || statusId === 4) {
    status = 'CANCELLED';
    isEligibleForGallery = false;
    revoked = false;
  } else if (statusId >= 5 && statusId <= 10) {
    status = 'CONFIRMED';
    isEligibleForGallery = true;
    revoked = false;
  } else if (statusId === 11 || statusId === 12) {
    status = 'DELIVERED';
    isEligibleForGallery = true;
    revoked = false;
  } else {
    throw new CrmClientError('Invalid response payload from CRM eligibility endpoint', false);
  }

  const customerUuid =
    record.customer &&
    typeof record.customer === 'object' &&
    typeof record.customer.uuid === 'string' &&
    record.customer.uuid.length > 0
      ? record.customer.uuid
      : undefined;

  const rawSocialConsent = Boolean(
    record.social_cover_consent === true ||
    record.allow_social_cover === true ||
    (record.gallery &&
      typeof record.gallery === 'object' &&
      record.gallery.social_cover_consent === true),
  );

  return {
    orderUuid: record.uuid,
    ...(customerUuid ? { customerUuid } : {}),
    status,
    isEligibleForGallery,
    revoked,
    allowSocialCoverPublishing: isEligibleForGallery && !revoked && rawSocialConsent,
  };
}

export class HttpCrmClient implements CrmClient {
  private readonly endpoint: string;
  private readonly secret: string;
  private readonly timeoutMs: number;
  private readonly endpointStyle: CrmEndpointStyle;

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
    const endpointStyle = options.endpointStyle ?? 'eligibility';
    if (endpointStyle !== 'eligibility' && endpointStyle !== 'laravel-detail') {
      throw new Error('CRM_ELIGIBILITY_ENDPOINT_STYLE_INVALID');
    }
    this.endpoint = url.href.replace(/\/+$/, '');
    this.secret = options.apiSecret;
    this.timeoutMs = timeoutMs;
    this.endpointStyle = endpointStyle;
  }

  async verifyEligibility(orderUuid: string): Promise<CrmOrderEligibility> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const encodedUuid = encodeURIComponent(orderUuid);
      const url =
        this.endpointStyle === 'laravel-detail'
          ? `${this.endpoint}/api/orders/${encodedUuid}/detail`
          : `${this.endpoint}/internal/v1/orders/${encodedUuid}/eligibility`;
      const authorizationHeader =
        this.endpointStyle === 'laravel-detail'
          ? this.secret
          : this.secret.startsWith('Bearer ')
            ? this.secret
            : 'Bearer ' + this.secret;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authorizationHeader,
          Accept: 'application/json',
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

      const rawBody: unknown = await response.json();
      const laravelParsed = parseLaravelOrderDetail(rawBody, orderUuid);
      if (laravelParsed) {
        return laravelParsed;
      }

      const body = rawBody as Partial<CrmOrderEligibility> | null;
      if (
        !body ||
        typeof body.orderUuid !== 'string' ||
        body.orderUuid.toLowerCase() !== orderUuid.toLowerCase() ||
        typeof body.isEligibleForGallery !== 'boolean' ||
        (body.status !== 'CONFIRMED' && body.status !== 'DELIVERED' && body.status !== 'CANCELLED')
      ) {
        throw new CrmClientError('Invalid response payload from CRM eligibility endpoint', false);
      }

      const isEligible = body.isEligibleForGallery && body.revoked !== true;
      return {
        orderUuid: body.orderUuid,
        ...(typeof body.customerUuid === 'string' ? { customerUuid: body.customerUuid } : {}),
        status: body.status,
        isEligibleForGallery: body.isEligibleForGallery,
        revoked: body.revoked === true,
        allowSocialCoverPublishing: isEligible && body.allowSocialCoverPublishing === true,
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
