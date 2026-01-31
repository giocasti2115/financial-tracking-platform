import type { NextFunction, Request, Response } from 'express';
import createError from 'http-errors';
import { ZodError } from 'zod';
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

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Datos inválidos. Revisa la información enviada.',
      issues: err.errors.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
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
