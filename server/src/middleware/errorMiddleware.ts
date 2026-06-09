import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorMiddleware(error: any, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed.',
      details: error.flatten()
    });
  }

  const statusCode = error instanceof ApiError ? error.statusCode : error.statusCode || 500;
  const message = error.message || 'Unexpected server error.';

  return res.status(statusCode).json({
    message,
    details: error.details,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
}
