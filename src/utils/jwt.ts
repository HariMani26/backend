import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { JWT_ACCESS_EXPIRES_IN, JWT_ACCESS_SECRET, JWT_REFRESH_EXPIRES_IN, JWT_REFRESH_SECRET } from '@config';
import type { UserRole } from '@models/User.model';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  family: string;
}

function requireSecret(secret: string | undefined, name: string): string {
  if (!secret) {
    throw new Error(`${name} must be set in the environment to sign/verify JWTs`);
  }
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, requireSecret(JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'), {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  // jwtid guarantees a unique token even when two refresh tokens for the same
  // sub+family are minted within the same second (identical iat would otherwise
  // produce byte-identical tokens and collide on the tokenHash unique index).
  return jwt.sign(payload, requireSecret(JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'), {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, requireSecret(JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET')) as AccessTokenPayload & jwt.JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, requireSecret(JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET')) as RefreshTokenPayload & jwt.JwtPayload;
}
