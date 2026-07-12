import jwt from 'jsonwebtoken';

import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '@utils/jwt';

describe('access tokens', () => {
  it('round-trips sub and role', () => {
    const token = signAccessToken({ sub: 'user-123', role: 'admin' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.role).toBe('admin');
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: 'user-123', role: 'admin' }, 'wrong-secret');
    expect(() => verifyAccessToken(forged)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('round-trips sub and family', () => {
    const token = signRefreshToken({ sub: 'user-456', family: 'family-abc' });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user-456');
    expect(payload.family).toBe('family-abc');
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ sub: 'user-456', family: 'family-abc' }, process.env.JWT_REFRESH_SECRET as string, {
      expiresIn: -1,
    });
    expect(() => verifyRefreshToken(expired)).toThrow(jwt.TokenExpiredError);
  });
});
