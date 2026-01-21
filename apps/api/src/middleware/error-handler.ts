import type { NextFunction, Request, Response } from 'express';
import createError from 'http-errors';
import { env } from '../env.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(createError(404, `Route ${req.method} ${req.originalUrl} not found`));
};

// Centralized error translator keeps responses consistent.
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (createError.isHttpError(err)) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  const payload: Record<string, unknown> = {
    message: 'Internal server error'
  };

  if (env.NODE_ENV !== 'production') {
    payload.stack = err instanceof Error ? err.stack : String(err);
  }

  res.status(500).json(payload);
};
