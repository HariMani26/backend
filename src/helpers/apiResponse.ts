import { Response } from 'express';

interface SuccessPayload<T> {
  success: true;
  message: string;
  data: T;
}

interface ErrorPayload {
  success: false;
  message: string;
  errors: string[];
}

/** Standard success envelope per CLAUDE.md API Standards. */
export function sendSuccess<T>(res: Response, data: T, message = '', statusCode = 200): Response {
  const payload: SuccessPayload<T> = { success: true, message, data };
  return res.status(statusCode).json(payload);
}

/** Standard error envelope per CLAUDE.md API Standards. */
export function sendError(res: Response, message: string, errors: string[] = [], statusCode = 400): Response {
  const payload: ErrorPayload = { success: false, message, errors };
  return res.status(statusCode).json(payload);
}
