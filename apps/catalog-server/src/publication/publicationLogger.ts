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
    // Ensure no token or credential accidentally leaks in details
    if (!params.details) return params;
    const sanitizedDetails: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(params.details)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('auth') ||
        lower.includes('bearer') ||
        lower.includes('password')
      ) {
        sanitizedDetails[key] = '[REDACTED]';
      } else {
        sanitizedDetails[key] = val;
      }
    }

    return {
      ...params,
      details: sanitizedDetails,
    };
  }
}
