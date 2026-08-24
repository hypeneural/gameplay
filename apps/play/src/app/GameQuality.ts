import type { QualityTier } from '@christmas-games/platform';

/**
 * Optional low-data preference only. It is intentionally a conservative hint:
 * browsers without it retain the tested NORMAL profile rather than guessing
 * from a potentially fingerprinting connection estimate.
 */
export interface ConnectionPreference {
  readonly saveData?: boolean;
}

export function resolveGameQuality(connection: ConnectionPreference | undefined): QualityTier {
  return connection?.saveData === true ? 'LOW' : 'NORMAL';
}
