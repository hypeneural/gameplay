export interface RunIdentity {
  runId: string;
  runSeed: number;
}

/** Uses Web Crypto; Math.random is intentionally not a fallback for a run seed. */
export function createRunIdentity(): RunIdentity {
  const entropy = new Uint32Array(1);
  crypto.getRandomValues(entropy);
  return {
    runId: crypto.randomUUID(),
    runSeed: entropy[0]!,
  };
}
