/**
 * Loader completion alone is not proof that every required file succeeded.
 * This tiny ledger is runtime-local so no URL or photo detail reaches domain/.
 */
export class RequiredAssetLedger {
  private readonly completed = new Set<string>();
  private failed = false;

  constructor(private readonly requiredKeys: ReadonlySet<string>) {
    if (requiredKeys.size === 0) throw new Error('Expresso needs at least one required asset key.');
  }

  markComplete(key: string): void {
    if (this.requiredKeys.has(key)) this.completed.add(key);
  }

  markFailed(key: string): void {
    if (this.requiredKeys.has(key)) this.failed = true;
  }

  get isReady(): boolean {
    return !this.failed && this.completed.size === this.requiredKeys.size;
  }
}
