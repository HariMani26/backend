import crypto from 'crypto';

/** Deterministic digest used to look up opaque tokens (e.g. refresh tokens) by exact match. */
export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
