import { createHash, createHmac } from 'node:crypto';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

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
  if (!serverSecret || serverSecret.length < 16) {
    throw new Error('server_secret_too_short');
  }
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
