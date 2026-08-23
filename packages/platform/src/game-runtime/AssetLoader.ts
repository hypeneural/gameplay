export interface AssetLoadOptions<T> {
  load(attempt: number): Promise<T>;
  fallback?(): Promise<T>;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  onRetry?(attempt: number, error: Error): void;
}

export interface AssetLoadResult<T> {
  value: T;
  source: 'primary' | 'fallback';
  attempts: number;
}

export class AssetLoadError extends Error {
  constructor(
    readonly attempts: number,
    override readonly cause: Error,
  ) {
    super(`Asset could not be loaded after ${attempts} attempt(s): ${cause.message}`, { cause });
    this.name = 'AssetLoadError';
  }
}

export class AssetLoader {
  async load<T>(options: AssetLoadOptions<T>): Promise<AssetLoadResult<T>> {
    const timeoutMs = options.timeoutMs ?? 10_000;
    const retries = options.retries ?? 2;
    const retryDelayMs = options.retryDelayMs ?? 250;
    if (
      !Number.isFinite(timeoutMs) ||
      timeoutMs <= 0 ||
      !Number.isInteger(retries) ||
      retries < 0
    ) {
      throw new Error(
        'AssetLoader requires a positive timeout and a non-negative integer retries value.',
      );
    }

    let lastError = new Error('Asset load did not start.');
    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      try {
        return {
          value: await this.withTimeout(options.load(attempt), timeoutMs),
          source: 'primary',
          attempts: attempt,
        };
      } catch (error) {
        lastError = toError(error);
        if (attempt <= retries) {
          options.onRetry?.(attempt, lastError);
          await this.delay(retryDelayMs);
        }
      }
    }

    if (options.fallback) {
      return { value: await options.fallback(), source: 'fallback', attempts: retries + 1 };
    }
    throw new AssetLoadError(retries + 1, lastError);
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`Timed out after ${timeoutMs}ms.`)),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  private async delay(milliseconds: number): Promise<void> {
    if (milliseconds <= 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
