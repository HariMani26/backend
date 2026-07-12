import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { verifyAccessToken } from '@utils/jwt';
import { ApiError } from '@utils/ApiError';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

/** Verifies the access token and attaches { id, role } to req.user. Rejects with 401 otherwise. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(ApiError.unauthorized('Missing bearer token'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthorized('Access token expired'));
      return;
    }
    next(ApiError.unauthorized('Invalid access token'));
  }
}
