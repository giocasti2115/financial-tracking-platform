import type { NextFunction, Request, Response } from 'express';
import createError from 'http-errors';
import { env } from '../env.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(createError(404, `Route ${req.method} ${req.originalUrl} not found`));
};

// Centralized error translator keeps responses consistent.
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = createError.isHttpError(err) ? err.statusCode : 500;
  const message = createError.isHttpError(err) ? err.message : 'Internal server error';
  const payload: Record<string, unknown> = { message };

  if (status === 500 && env.NODE_ENV !== 'production') {
    payload.stack = err instanceof Error ? err.stack : err;
  }

  res.status(status).json(payload);
};
