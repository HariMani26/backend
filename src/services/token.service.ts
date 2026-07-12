import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import type { UserRole } from '@models/User.model';
import { refreshTokenRepository } from '@repositories/refreshToken.repository';
import { ApiError } from '@utils/ApiError';
import { sha256Hex } from '@utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@utils/jwt';

export interface RotatedRefreshToken {
  userId: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

function decodeExpiry(token: string): Date {
  const decoded = jwt.decode(token) as jwt.JwtPayload | null;
  if (!decoded?.exp) {
    throw new Error('Signed token is missing an exp claim');
  }
  return new Date(decoded.exp * 1000);
}

export const tokenService = {
  /** Issues a brand-new token pair, starting a fresh rotation family (e.g. on login). */
  async issueTokenPair(userId: string, role: UserRole, meta: RequestMeta = {}): Promise<TokenPair> {
    const family = crypto.randomUUID();
    const accessToken = signAccessToken({ sub: userId, role });
    const refreshToken = signRefreshToken({ sub: userId, family });

    await refreshTokenRepository.create({
      userId,
      tokenHash: sha256Hex(refreshToken),
      family,
      expiresAt: decodeExpiry(refreshToken),
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    return { accessToken, refreshToken };
  },

  /**
   * Rotates a refresh token within its existing family and returns the new refresh
   * token plus the owning userId — NOT a fresh access token, since the caller must
   * re-read the user's current role/active status from the DB before minting one
   * (a stale role claim on an old refresh token must never leak into a new access token).
   * If the presented token is not found active (already rotated away or revoked), the
   * whole family is burned — the standard signal that a stolen token is being replayed.
   */
  async rotateRefreshToken(rawRefreshToken: string, meta: RequestMeta = {}): Promise<RotatedRefreshToken> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const presentedHash = sha256Hex(rawRefreshToken);
    const stored = await refreshTokenRepository.findActiveByTokenHash(presentedHash);

    if (!stored) {
      await refreshTokenRepository.revokeFamily(payload.family);
      throw ApiError.unauthorized('Refresh token has already been used or revoked');
    }

    const newRefreshToken = signRefreshToken({ sub: payload.sub, family: payload.family });
    const newHash = sha256Hex(newRefreshToken);

    await refreshTokenRepository.create({
      userId: payload.sub,
      tokenHash: newHash,
      family: payload.family,
      expiresAt: decodeExpiry(newRefreshToken),
      userAgent: meta.userAgent,
      ip: meta.ip,
    });
    await refreshTokenRepository.revoke(String(stored._id), newHash);

    return { userId: payload.sub, refreshToken: newRefreshToken };
  },

  signAccessTokenFor(userId: string, role: UserRole): string {
    return signAccessToken({ sub: userId, role });
  },

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const stored = await refreshTokenRepository.findActiveByTokenHash(sha256Hex(rawRefreshToken));
    if (stored) {
      await refreshTokenRepository.revoke(String(stored._id));
    }
  },

  revokeAllForUser(userId: string): Promise<unknown> {
    return refreshTokenRepository.revokeAllForUser(userId);
  },
};
