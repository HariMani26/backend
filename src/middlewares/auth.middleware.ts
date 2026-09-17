import { NextFunction, Request, Response } from 'express';

import { ApiError } from '@utils/ApiError';
import { verifyAccessToken } from '@utils/jwt';
import { UserModel, NOT_DELETED } from '@models/User.model';

const getAuthorization = (req: Request): string | null => {
  const header = req.header('Authorization');
  if (header?.startsWith('Bearer ')) return header.split('Bearer ')[1];

  return null;
};

export const AuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = getAuthorization(req);
    if (!token) {
      throw ApiError.unauthorized('Authentication token missing');
    }

    const payload = verifyAccessToken(token);
    const user = await UserModel.findOne({ _id: payload.sub, ...NOT_DELETED });
    if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or inactive');
    req.user = { id: String(user._id), role: user.role };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired authentication token'));
  }
};

