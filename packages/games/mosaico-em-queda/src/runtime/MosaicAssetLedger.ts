/** Proves that every required run-private texture completed before play begins. */
export class MosaicAssetLedger {
  private readonly completed = new Set<string>();
  private readonly failedKeys = new Set<string>();
  private failed = false;

  constructor(private readonly requiredKeys: ReadonlySet<string>) {
    if (requiredKeys.size === 0) throw new Error('Mosaic asset ledger requires at least one key.');
  }

  markComplete(key: string): void {
    if (this.requiredKeys.has(key)) this.completed.add(key);
  }

  has(key: string): boolean {
    return this.requiredKeys.has(key);
  }

  markFailed(key: string): void {
    if (!this.requiredKeys.has(key)) return;
    this.failed = true;
    this.failedKeys.add(key);
  }

  get failures(): readonly string[] {
    return [...this.failedKeys];
  }

  get isSettled(): boolean {
    return new Set([...this.completed, ...this.failedKeys]).size === this.requiredKeys.size;
  }

  get isReady(): boolean {
    return !this.failed && this.completed.size === this.requiredKeys.size;
  }
}
