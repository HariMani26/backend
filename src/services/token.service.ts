import crypto from "crypto";

import jwt from "jsonwebtoken";

import { RefreshTokenModel } from "@models/RefreshToken.model";
import type { UserRole } from "@models/User.model";
import { ApiError } from "@utils/ApiError";
import { sha256Hex } from "@utils/hash";
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "@utils/jwt";
import { Container, Service } from "typedi";

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
    throw new Error("Signed token is missing an exp claim");
  }
  return new Date(decoded.exp * 1000);
}

@Service()
export class TokenService {
  /** Issues a brand-new token pair, starting a fresh rotation family (e.g. on login). */
  public async issueTokenPair(
    userId: string,
    role: UserRole,
    meta: RequestMeta = {},
  ): Promise<TokenPair> {
    const family = crypto.randomUUID();
    const accessToken = signAccessToken({ sub: userId, role });
    const refreshToken = signRefreshToken({ sub: userId, family });

    await RefreshTokenModel.create({
      userId,
      tokenHash: sha256Hex(refreshToken),
      family,
      expiresAt: decodeExpiry(refreshToken),
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Rotates a refresh token within its existing family and returns the new refresh
   * token plus the owning userId — NOT a fresh access token, since the caller must
   * re-read the user's current role/active status from the DB before minting one
   * (a stale role claim on an old refresh token must never leak into a new access token).
   * If the presented token is not found active (already rotated away or revoked), the
   * whole family is burned — the standard signal that a stolen token is being replayed.
   */
  public async rotateRefreshToken(
    rawRefreshToken: string,
    meta: RequestMeta = {},
  ): Promise<RotatedRefreshToken> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const presentedHash = sha256Hex(rawRefreshToken);
    const stored = await RefreshTokenModel.findOne({
      tokenHash: presentedHash,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!stored) {
      await RefreshTokenModel.updateMany(
        { family: payload.family, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
      throw ApiError.unauthorized(
        "Refresh token has already been used or revoked",
      );
    }

    const newRefreshToken = signRefreshToken({
      sub: payload.sub,
      family: payload.family,
    });
    const newHash = sha256Hex(newRefreshToken);

    await RefreshTokenModel.create({
      userId: payload.sub,
      tokenHash: newHash,
      family: payload.family,
      expiresAt: decodeExpiry(newRefreshToken),
      userAgent: meta.userAgent,
      ip: meta.ip,
    });
    await RefreshTokenModel.findByIdAndUpdate(stored._id, {
      $set: { revokedAt: new Date(), replacedByTokenHash: newHash },
    });

    return { userId: payload.sub, refreshToken: newRefreshToken };
  }

  public signAccessTokenFor(userId: string, role: UserRole): string {
    return signAccessToken({ sub: userId, role });
  }

  public async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const stored = await RefreshTokenModel.findOne({
      tokenHash: sha256Hex(rawRefreshToken),
      revokedAt: { $exists: false },
    });
    if (stored) {
      await RefreshTokenModel.findByIdAndUpdate(stored._id, {
        $set: { revokedAt: new Date() },
      });
    }
  }

  public revokeAllForUser(userId: string): Promise<unknown> {
    return RefreshTokenModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  }
}

export const tokenService = Container.get(TokenService);
