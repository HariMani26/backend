import { sha256Hex } from '@utils/hash';

describe('sha256Hex', () => {
  it('is deterministic for the same input', () => {
    expect(sha256Hex('refresh-token-value')).toBe(sha256Hex('refresh-token-value'));
  });

  it('differs for different inputs', () => {
    expect(sha256Hex('token-a')).not.toBe(sha256Hex('token-b'));
  });

  it('returns a 64-character hex digest', () => {
    expect(sha256Hex('anything')).toMatch(/^[0-9a-f]{64}$/);
  });
});
