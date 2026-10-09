import { randomUUID } from 'node:crypto';

export interface PublicationLogEntry {
  readonly timestamp: string;
  readonly runId: string;
  readonly requestId: string;
  readonly event: string;
  readonly method?: string;
  readonly path?: string;
  readonly status?: number;
  readonly durationMs?: number;
  readonly revisionId?: string;
  readonly blobId?: string;
  readonly byteLength?: number;
  readonly details?: Record<string, unknown>;
}

export interface PublicationLogger {
  readonly runId: string;
  log(event: string, params: Omit<PublicationLogEntry, 'timestamp' | 'runId' | 'event'>): void;
}

export class StructuredPublicationLogger implements PublicationLogger {
  readonly runId: string;
  private readonly sink: (line: string) => void;

  constructor(dependencies?: { runId?: string; sink?: (line: string) => void }) {
    this.runId = dependencies?.runId ?? randomUUID();
    this.sink = dependencies?.sink ?? ((line: string) => process.stdout.write(`${line}\n`));
  }

  log(event: string, params: Omit<PublicationLogEntry, 'timestamp' | 'runId' | 'event'>): void {
    const entry: PublicationLogEntry = {
      timestamp: new Date().toISOString(),
      runId: this.runId,
      event,
      ...this.sanitize(params),
    };

    try {
      this.sink(JSON.stringify(entry));
    } catch {
      // Avoid throwing on serialization
    }
  }

  private sanitize(
    params: Omit<PublicationLogEntry, 'timestamp' | 'runId' | 'event'>,
  ): Omit<PublicationLogEntry, 'timestamp' | 'runId' | 'event'> {
    // URLs under /s/ contain bearer capability tokens: log the route template,
    // NEVER the real URL. Only explicitly approved numeric/status details survive.
    const path = typeof params.path === 'string'
      ? params.path.split('?')[0]!
          .replace(/\\/g, '/')
          .replace(/\\/s\\/[A-Za-z0-9_-]{16,128}(?=\\/|$)/g, '/s/:token')
          .replace(/\\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\\/|$)/gi, '/:id')
      : undefined;
    const allowed = new Set(['status', 'expectedBlobs', 'readyBlobs', 'photosCount', 'photoCount']);
    const details: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params.details ?? {})) {
      if (allowed.has(key) && (
        typeof value === 'number' || typeof value === 'boolean' ||
        (typeof value === 'string' && /^[A-Z_]{1,32}$/.test(value))
      )) {
        details[key] = value;
      }
    }
    return {
      ...params,
      ...(path === undefined ? {} : { path }),
      ...(params.details === undefined ? {} : { details }),
    };
  }
}
