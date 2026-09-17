import { HttpException } from "@exceptions/httpException";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import { NextFunction, Request, Response } from "express";

export const ErrorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const status: number =
      error instanceof ApiError ? error.statusCode : error.status || 500;
    const message: string = error.message || "Something went wrong";

    logger.error(
      `[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`,
    );
    res.status(status).json({ message });
  } catch (error) {
    next(error);
  }
};
