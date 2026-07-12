import { NextFunction, Request, Response } from 'express';

import type { UserRole } from '@models/User.model';
import { ApiError } from '@utils/ApiError';

/** Role guard — must run after `authenticate`. */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(ApiError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
