import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { MAX_BLOB_BYTE_LENGTH } from '../storage/FileSystemStorageService.js';
import type { StorageService } from '../storage/FileSystemStorageService.js';
import type { PublicationErrorCode, SessionRepository } from './SessionRepository.js';
import { PublicationDomainError } from './SessionRepository.js';
import type { PublicationLogger } from './publicationLogger.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_JSON_BODY_LENGTH = 2 * 1024 * 1024; // 2 MiB for JSON manifests

export interface PublicationServiceDependencies {
  readonly sessionRepository: SessionRepository;
  readonly storageService: StorageService;
  readonly publisherSecret: string;
  readonly logger?: PublicationLogger;
  readonly publicBaseUrl?: string;
}

export class PublicationService {
  private readonly sessionRepo: SessionRepository;
  private readonly storage: StorageService;
  private readonly publisherSecret: string;
  private readonly logger: PublicationLogger | undefined;
  private readonly publicBaseUrl: string | undefined;

  constructor(dependencies: PublicationServiceDependencies) {
    if (!dependencies.publisherSecret || dependencies.publisherSecret.length < 16) {
      throw new Error('publisherSecret must be at least 16 characters long');
    }
    this.sessionRepo = dependencies.sessionRepository;
    this.storage = dependencies.storageService;
    this.publisherSecret = dependencies.publisherSecret;
    this.logger = dependencies.logger;
    this.publicBaseUrl = dependencies.publicBaseUrl;
  }

  async handleHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const startTime = Date.now();
    const urlObj = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = urlObj.pathname;
    const method = request.method ?? 'GET';
    const requestId = this.resolveRequestId(request);

    response.setHeader('X-Request-ID', requestId);

    // 1. POST /internal/v1/sessions/resolve
    if (pathname === '/internal/v1/sessions/resolve') {
      if (method !== 'POST') {
        this.sendError(response, 405, 'INTERNAL_ERROR', 'Method not allowed', requestId);
        return true;
      }
      await this.handleResolveSession(request, response, requestId, startTime);
      return true;
    }

    // 2. POST /internal/v1/publications
    if (pathname === '/internal/v1/publications') {
      if (method !== 'POST') {
        this.sendError(response, 405, 'INTERNAL_ERROR', 'Method not allowed', requestId);
        return true;
      }
      await this.handleBeginPublication(request, response, requestId, startTime);
      return true;
    }

    // 3. /internal/v1/publications/:revisionId (GET or sub-paths)
    if (pathname.startsWith('/internal/v1/publications/')) {
      const subPath = pathname.slice('/internal/v1/publications/'.length);
      const segments = subPath.split('/').filter(Boolean);

      // GET /internal/v1/publications/:revisionId
      if (segments.length === 1) {
        if (method !== 'GET') {
          this.sendError(response, 405, 'INTERNAL_ERROR', 'Method not allowed', requestId);
          return true;
        }
        await this.handleGetPublication(segments[0]!, response, request, requestId, startTime);
        return true;
      }

      // PUT /internal/v1/publications/:revisionId/blobs/:blobId
      if (segments.length === 3 && segments[1] === 'blobs') {
        if (method !== 'PUT') {
          this.sendError(response, 405, 'INTERNAL_ERROR', 'Method not allowed', requestId);
          return true;
        }
        await this.handleUploadBlob(
          segments[0]!,
          segments[2]!,
          request,
          response,
          requestId,
          startTime,
        );
        return true;
      }

      // POST /internal/v1/publications/:revisionId/activate
      if (segments.length === 2 && segments[1] === 'activate') {
        if (method !== 'POST') {
          this.sendError(response, 405, 'INTERNAL_ERROR', 'Method not allowed', requestId);
          return true;
        }
        await this.handleActivatePublication(segments[0]!, request, response, requestId, startTime);
        return true;
      }
    }

    // 4. GET /s/:token/data
    const tokenDataMatch = /^\/s\/([A-Za-z0-9_-]+)\/data$/.exec(pathname);
    if (tokenDataMatch) {
      if (method !== 'GET' && method !== 'HEAD') {
        this.sendError(response, 405, 'INTERNAL_ERROR', 'Method not allowed', requestId);
        return true;
      }
      await this.handleGetSessionData(tokenDataMatch[1]!, response, requestId, startTime);
      return true;
    }

    // 5. GET /s/:token/media/:revisionId/:photoId/:variant
    const tokenMediaMatch =
      /^\/s\/([A-Za-z0-9_-]+)\/media\/([0-9a-f-]{36})\/([a-z0-9-]+)\/(thumb|card|game)$/i.exec(
        pathname,
      );
    if (tokenMediaMatch) {
      if (method !== 'GET' && method !== 'HEAD') {
        this.sendError(response, 405, 'INTERNAL_ERROR', 'Method not allowed', requestId);
        return true;
      }
      await this.handleGetPrivateMedia(
        tokenMediaMatch[1]!,
        tokenMediaMatch[2]!,
        tokenMediaMatch[3]!,
        tokenMediaMatch[4] as 'thumb' | 'card' | 'game',
        response,
        requestId,
        startTime,
      );
      return true;
    }

    return false;
  }

  private async handleResolveSession(
    request: IncomingMessage,
    response: ServerResponse,
    requestId: string,
    startTime: number,
  ): Promise<void> {
    if (!this.checkPublisherAuth(request, response, requestId)) return;

    let body: unknown;
    try {
      body = await this.readJsonBody(request);
    } catch {
      this.sendError(response, 422, 'INVALID_MANIFEST', 'Invalid JSON body', requestId);
      return;
    }

    const crmOrderUuid = (body as { crmOrderUuid?: unknown })?.crmOrderUuid;
    if (typeof crmOrderUuid !== 'string' || !UUID_PATTERN.test(crmOrderUuid)) {
      this.sendError(
        response,
        404,
        'SESSION_NOT_FOUND',
        'CRM order could not be verified.',
        requestId,
      );
      return;
    }

    try {
      const resolved = await this.sessionRepo.resolveOrCreateSession(crmOrderUuid);
      const statusCode = resolved.isNew ? 201 : 200;
      this.sendJson(response, statusCode, {
        sessionId: resolved.sessionId,
        activeRevisionId: resolved.activeRevisionId,
        status: resolved.status,
      });
      this.logger?.log('session_resolved', {
        requestId,
        method: 'POST',
        path: '/internal/v1/sessions/resolve',
        status: statusCode,
        durationMs: Date.now() - startTime,
        details: { sessionId: resolved.sessionId, status: resolved.status },
      });
    } catch (error) {
      this.handleDomainError(response, error, requestId);
    }
  }

  private async handleBeginPublication(
    request: IncomingMessage,
    response: ServerResponse,
    requestId: string,
    startTime: number,
  ): Promise<void> {
    if (!this.checkPublisherAuth(request, response, requestId)) return;

    let manifestInput: unknown;
    try {
      manifestInput = await this.readJsonBody(request);
    } catch {
      this.sendError(response, 422, 'INVALID_MANIFEST', 'Invalid JSON manifest body', requestId);
      return;
    }

    try {
      const state = await this.sessionRepo.beginPublication(manifestInput);
      const statusCode = state.isReplay ? 200 : 201;
      this.sendJson(response, statusCode, state);
      this.logger?.log('publication_staged', {
        requestId,
        method: 'POST',
        path: '/internal/v1/publications',
        status: statusCode,
        durationMs: Date.now() - startTime,
        revisionId: state.revisionId,
        details: { sessionId: state.sessionId, expectedBlobs: state.expectedBlobs },
      });
    } catch (error) {
      this.handleDomainError(response, error, requestId);
    }
  }

  private async handleGetPublication(
    revisionId: string,
    response: ServerResponse,
    request: IncomingMessage,
    requestId: string,
    startTime: number,
  ): Promise<void> {
    if (!this.checkPublisherAuth(request, response, requestId)) return;

    if (!UUID_PATTERN.test(revisionId)) {
      this.sendError(response, 404, 'REVISION_NOT_FOUND', 'Revision does not exist.', requestId);
      return;
    }

    try {
      const state = await this.sessionRepo.getPublicationStatus(revisionId);
      this.sendJson(response, 200, state);
      this.logger?.log('publication_status_retrieved', {
        requestId,
        method: 'GET',
        path: `/internal/v1/publications/${revisionId}`,
        status: 200,
        durationMs: Date.now() - startTime,
        revisionId,
      });
    } catch (error) {
      this.handleDomainError(response, error, requestId);
    }
  }

  private async handleUploadBlob(
    revisionId: string,
    blobId: string,
    request: IncomingMessage,
    response: ServerResponse,
    requestId: string,
    startTime: number,
  ): Promise<void> {
    if (!this.checkPublisherAuth(request, response, requestId)) return;

    if (!UUID_PATTERN.test(revisionId) || !UUID_PATTERN.test(blobId)) {
      this.sendError(response, 404, 'REVISION_NOT_FOUND', 'Revision does not exist.', requestId);
      return;
    }

    const contentLength = request.headers['content-length'];
    if (contentLength && Number(contentLength) > MAX_BLOB_BYTE_LENGTH) {
      this.sendError(response, 413, 'QUOTA_EXCEEDED', 'Blob is too large.', requestId);
      return;
    }

    const sha256Header = request.headers['x-content-sha256'];
    if (typeof sha256Header !== 'string' || !SHA256_PATTERN.test(sha256Header)) {
      this.sendError(
        response,
        422,
        'INVALID_MEDIA',
        'Missing or invalid X-Content-SHA256 header',
        requestId,
      );
      return;
    }

    // Check with repository for expected blob specification
    let expected: Awaited<ReturnType<SessionRepository['getExpectedBlob']>>;
    try {
      expected = await this.sessionRepo.getExpectedBlob(revisionId, blobId);
    } catch (error) {
      this.handleDomainError(response, error, requestId);
      return;
    }

    if (!expected) {
      this.sendError(response, 404, 'REVISION_NOT_FOUND', 'Revision does not exist.', requestId);
      return;
    }

    if (expected.sessionStatus === 'REVOKED') {
      this.sendError(response, 404, 'SESSION_NOT_FOUND', 'Session is revoked.', requestId);
      return;
    }

    if (expected.revisionState !== 'STAGED') {
      this.sendError(
        response,
        409,
        'INVALID_MEDIA',
        'Blob already registered with different bytes or revision not staged.',
        requestId,
      );
      return;
    }

    if (expected.sha256.toLowerCase() !== sha256Header.toLowerCase()) {
      this.sendError(
        response,
        409,
        'INVALID_MEDIA',
        'Blob already registered with different bytes or revision not staged.',
        requestId,
      );
      return;
    }

    // Idempotent retry: already READY and confirmed on disk
    if (expected.state === 'READY') {
      const exists = await this.storage.hasBlob(
        revisionId,
        blobId,
        expected.sha256,
        expected.byteLength,
      );
      if (exists) {
        this.sendJson(response, 200, {
          blobId,
          state: 'READY',
          byteLength: expected.byteLength,
        });
        return;
      }
    }

    // Store physical blob
    try {
      const confirmation = await this.storage.storeBlob(request, {
        revisionId,
        blobId,
        expectedSha256: expected.sha256,
        expectedByteLength: expected.byteLength,
        expectedWidth: expected.width,
        expectedHeight: expected.height,
      });

      await this.sessionRepo.recordVerifiedBlob(confirmation);

      this.sendJson(response, 201, {
        blobId,
        state: 'READY',
        byteLength: confirmation.byteLength,
      });

      this.logger?.log('blob_uploaded_and_verified', {
        requestId,
        method: 'PUT',
        path: `/internal/v1/publications/${revisionId}/blobs/${blobId}`,
        status: 201,
        durationMs: Date.now() - startTime,
        revisionId,
        blobId,
        byteLength: confirmation.byteLength,
      });
    } catch (error) {
      if (error instanceof PublicationDomainError && error.code === 'QUOTA_EXCEEDED') {
        this.sendError(response, 413, 'QUOTA_EXCEEDED', error.message, requestId);
        return;
      }
      this.handleDomainError(response, error, requestId);
    }
  }

  private async handleActivatePublication(
    revisionId: string,
    request: IncomingMessage,
    response: ServerResponse,
    requestId: string,
    startTime: number,
  ): Promise<void> {
    if (!this.checkPublisherAuth(request, response, requestId)) return;

    if (!UUID_PATTERN.test(revisionId)) {
      this.sendError(response, 404, 'REVISION_NOT_FOUND', 'Revision does not exist.', requestId);
      return;
    }

    let body: unknown;
    try {
      body = await this.readJsonBody(request);
    } catch {
      this.sendError(
        response,
        422,
        'INVALID_MANIFEST',
        'Invalid activation request body',
        requestId,
      );
      return;
    }

    const expectedActive = (body as { expectedActiveRevisionId?: unknown })
      ?.expectedActiveRevisionId;
    if (expectedActive !== null && typeof expectedActive !== 'string') {
      this.sendError(
        response,
        422,
        'INVALID_MANIFEST',
        'expectedActiveRevisionId must be string or null',
        requestId,
      );
      return;
    }

    try {
      const receipt = await this.sessionRepo.activatePublication(
        revisionId,
        (expectedActive as string | null) ?? null,
        this.publicBaseUrl,
      );

      this.sendJson(response, 200, receipt);
      this.logger?.log('publication_activated', {
        requestId,
        method: 'POST',
        path: `/internal/v1/publications/${revisionId}/activate`,
        status: 200,
        durationMs: Date.now() - startTime,
        revisionId,
        details: { sessionId: receipt.sessionId, photoCount: receipt.photoCount },
      });
    } catch (error) {
      this.handleDomainError(response, error, requestId);
    }
  }

  private async handleGetSessionData(
    token: string,
    response: ServerResponse,
    requestId: string,
    startTime: number,
  ): Promise<void> {
    try {
      const gallerySession = await this.sessionRepo.getActiveSession(token);
      if (!gallerySession) {
        this.sendError(
          response,
          404,
          'SESSION_NOT_FOUND',
          'Session link is unknown, revoked or unpublished.',
          requestId,
        );
        return;
      }

      this.sendJson(response, 200, gallerySession);
      this.logger?.log('session_data_served', {
        requestId,
        method: 'GET',
        path: '/s/:token/data',
        status: 200,
        durationMs: Date.now() - startTime,
        details: { sessionId: gallerySession.id, photosCount: gallerySession.photos.length },
      });
    } catch (error) {
      this.handleDomainError(response, error, requestId);
    }
  }

  private async handleGetPrivateMedia(
    token: string,
    revisionId: string,
    photoId: string,
    variant: 'thumb' | 'card' | 'game',
    response: ServerResponse,
    requestId: string,
    startTime: number,
  ): Promise<void> {
    const blobId = await this.sessionRepo.getBlobIdForPhotoVariant(
      token,
      revisionId,
      photoId,
      variant,
    );

    if (!blobId) {
      this.sendError(
        response,
        404,
        'SESSION_NOT_FOUND',
        'Unauthorized or stale revision/media.',
        requestId,
      );
      return;
    }

    const streamResult = await this.storage.getBlobStream(revisionId, blobId);
    if (!streamResult) {
      this.sendError(
        response,
        404,
        'SESSION_NOT_FOUND',
        'Unauthorized or stale revision/media.',
        requestId,
      );
      return;
    }

    response.statusCode = 200;
    response.setHeader('Content-Type', 'image/webp');
    response.setHeader('Content-Length', streamResult.byteLength);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');

    streamResult.stream
      .on('error', () => {
        if (!response.headersSent) {
          this.sendError(response, 500, 'INTERNAL_ERROR', 'Error streaming derivative', requestId);
        } else {
          response.destroy();
        }
      })
      .pipe(response);

    this.logger?.log('private_media_served', {
      requestId,
      method: 'GET',
      path: '/s/:token/media/:revisionId/:photoId/:variant',
      status: 200,
      durationMs: Date.now() - startTime,
      revisionId,
      blobId,
      byteLength: streamResult.byteLength,
    });
  }

  private checkPublisherAuth(
    request: IncomingMessage,
    response: ServerResponse,
    requestId: string,
  ): boolean {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.sendError(
        response,
        401,
        'PUBLISHER_UNAUTHORIZED',
        'Publisher access denied.',
        requestId,
      );
      return false;
    }

    const provided = authHeader.slice('Bearer '.length).trim();
    const providedBuf = Buffer.from(provided, 'utf8');
    const expectedBuf = Buffer.from(this.publisherSecret, 'utf8');

    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
      this.sendError(
        response,
        401,
        'PUBLISHER_UNAUTHORIZED',
        'Publisher access denied.',
        requestId,
      );
      return false;
    }

    return true;
  }

  private handleDomainError(response: ServerResponse, error: unknown, requestId: string): void {
    if (error instanceof PublicationDomainError) {
      let status: number;
      switch (error.code) {
        case 'PUBLISHER_UNAUTHORIZED':
          status = 401;
          break;
        case 'SESSION_NOT_FOUND':
        case 'REVISION_NOT_FOUND':
          status = 404;
          break;
        case 'IDEMPOTENCY_CONFLICT':
        case 'STALE_REVISION':
          status = 409;
          break;
        case 'QUOTA_EXCEEDED':
          status = 413;
          break;
        case 'INVALID_MANIFEST':
        case 'INVALID_MEDIA':
        case 'UPLOAD_INCOMPLETE':
          status = 422;
          break;
        case 'RATE_LIMITED':
          status = 429;
          break;
        case 'INTERNAL_ERROR':
        default:
          status = 500;
          break;
      }
      this.sendError(response, status, error.code, error.message, requestId);
      return;
    }

    this.sendError(response, 500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }

  private sendError(
    response: ServerResponse,
    status: number,
    code: PublicationErrorCode,
    message: string,
    requestId: string,
  ): void {
    this.sendJson(response, status, { code, message, requestId });
  }

  private sendJson(response: ServerResponse, status: number, body: object): void {
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(JSON.stringify(body));
  }

  private resolveRequestId(request: IncomingMessage): string {
    const header = request.headers['x-request-id'];
    if (typeof header === 'string' && UUID_PATTERN.test(header)) {
      return header;
    }
    return randomUUID();
  }

  private async readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let length = 0;

    for await (const chunk of request) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      length += buf.length;
      if (length > MAX_JSON_BODY_LENGTH) {
        throw new PublicationDomainError('INVALID_MANIFEST', 'JSON payload exceeds size limit');
      }
      chunks.push(buf);
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(raw);
  }
}
