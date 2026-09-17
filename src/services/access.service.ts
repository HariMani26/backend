import { IProfile } from '@models/Profile.model';

export function evaluateAccess(
  profile: Pick<IProfile, 'verificationStatus' | 'accessTill'> | null,
  role = 'user',
  now = Date.now(),
) {
  if (role === 'admin' || role === 'superAdmin') return { hasFullAccess: true, reason: 'admin', expiresAt: profile?.accessTill };
  if (!profile) return { hasFullAccess: false, reason: 'registration', expiresAt: undefined };
  const expires = profile.accessTill?.getTime() ?? 0;
  const blocked = ['rejected', 'refunded', 'suspended'].includes(profile.verificationStatus);
  const hasFullAccess = !blocked && profile.verificationStatus === 'verified' && expires > now;
  const reason = blocked ? profile.verificationStatus : expires <= now
    ? (expires ? 'expired' : 'payment') : profile.verificationStatus !== 'verified' ? 'verification' : 'active';
  return { hasFullAccess, reason, expiresAt: profile.accessTill };
}