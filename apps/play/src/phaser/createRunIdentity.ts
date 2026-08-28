export interface RunIdentity {
  runId: string;
  runSeed: number;
}

/** Uses Web Crypto; Math.random is intentionally not a fallback for a run seed. */
export function createRunIdentity(runSeed?: number): RunIdentity {
  if (
    runSeed !== undefined &&
    (!Number.isInteger(runSeed) || runSeed < 0 || runSeed > 0xffffffff)
  ) {
    throw new Error('A supplied run seed must be an unsigned 32-bit integer.');
  }
  const entropy = new Uint32Array(1);
  if (runSeed === undefined) crypto.getRandomValues(entropy);
  return {
    runId: crypto.randomUUID(),
    runSeed: runSeed ?? entropy[0]!,
  };
}
