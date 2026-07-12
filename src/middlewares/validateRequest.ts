import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

import { ApiError } from '@utils/ApiError';

interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatZodError(error: ZodError): string[] {
  return error.errors.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
}

/** Validates and coerces req.body/query/params against zod schemas before the controller runs. */
export function validateRequest(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as unknown as Request['query'];
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as unknown as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(ApiError.badRequest('Validation failed', formatZodError(error)));
        return;
      }
      next(error);
    }
  };
}
