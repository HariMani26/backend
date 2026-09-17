import { evaluateAccess } from './access.service';

describe('Membership and verification access', () => {
  const now = Date.parse('2026-09-17T12:00:00Z');
  const future = new Date(now + 86400000);
  it('requires registration for ordinary users', () => {
    expect(evaluateAccess(null, 'user', now).reason).toBe('registration');
  });
  it('does not equate paid access with identity verification', () => {
    expect(evaluateAccess({ verificationStatus: 'unverified', accessTill: future }, 'user', now)).toMatchObject({ hasFullAccess: false, reason: 'verification' });
  });
  it('grants access only while verified membership remains active', () => {
    expect(evaluateAccess({ verificationStatus: 'verified', accessTill: future }, 'user', now).hasFullAccess).toBe(true);
    expect(evaluateAccess({ verificationStatus: 'verified', accessTill: new Date(now) }, 'user', now)).toMatchObject({ hasFullAccess: false, reason: 'expired' });
  });
  it.each(['rejected', 'refunded', 'suspended'] as const)('blocks %s despite a future expiry', (verificationStatus) => {
    expect(evaluateAccess({ verificationStatus, accessTill: future }, 'user', now).hasFullAccess).toBe(false);
  });
  it('preserves admin access', () => {
    expect(evaluateAccess(null, 'admin', now).hasFullAccess).toBe(true);
  });
});