import { NextFunction, Request, Response } from 'express';

import { isProduction } from '@config/env';
import { logger } from '@config/logger';
import { sendError } from '@helpers/apiResponse';
import { ApiError } from '@utils/ApiError';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, [], 404);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, err);
    }
    sendError(res, err.message, err.errors, err.statusCode);
    return;
  }

  const error = err instanceof Error ? err : new Error('Unknown error');
  logger.error(error.message, error);

  sendError(res, isProduction ? 'Internal server error' : error.message, [], 500);
}
