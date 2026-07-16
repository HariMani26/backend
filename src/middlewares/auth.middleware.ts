import { NextFunction, Request, Response } from 'express';

import { ApiError } from '@utils/ApiError';
import { verifyAccessToken } from '@utils/jwt';

const getAuthorization = (req: Request): string | null => {
  const header = req.header('Authorization');
  if (header?.startsWith('Bearer ')) return header.split('Bearer ')[1];

  return null;
};

export const AuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = getAuthorization(req);
    if (!token) {
      throw ApiError.unauthorized('Authentication token missing');
    }

    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired authentication token'));
  }
};

