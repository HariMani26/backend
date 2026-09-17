import { RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';

export function requireRoles(...roles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Administrator access required'));
    next();
  };
}