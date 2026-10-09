import { createHash, createHmac } from 'node:crypto';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * Asserts that the provided server secret meets strict entropy requirements.
 * Must be a non-empty string of at least 32 characters.
 */
export function assertValidServerSecret(serverSecret: unknown): asserts serverSecret is string {
  if (typeof serverSecret !== 'string' || serverSecret.trim().length < 32) {
    throw new Error('server_secret_must_be_at_least_32_characters');
  }
}

/**
 * Derives a customer capability token deterministically using HMAC-SHA256
 * over the session ID and access version.
 *
 * This allows the publisher to reconstruct the link without storing plaintext
 * tokens in the database, while rotating tokens instantly on version increment.
 */
export function derivePublicToken(
  serverSecret: string,
  sessionId: string,
  accessVersion: number,
): string {
  assertValidServerSecret(serverSecret);
  const payload = `${sessionId}:${accessVersion}`;
  return createHmac('sha256', serverSecret).update(payload).digest('base64url');
}

/**
 * Computes the canonical SHA-256 hex digest of a token for database lookup.
 */
export function computeTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validates that a token strictly satisfies the capability string contract.
 */
export function isValidTokenFormat(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}
