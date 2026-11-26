import type { NextFunction, Request, Response } from 'express';
import createError from 'http-errors';
import { authRateLimiter, type AuthRateScope } from '../security/rate-limit.js';

export const AUTH_RATE_LIMIT_MESSAGE = 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';

export const authRateLimit = (scope: AuthRateScope) => (req: Request, res: Response, next: NextFunction) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : undefined;
  const result = authRateLimiter.consume({
    scope,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    email
  });

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds));
    next(createError(429, AUTH_RATE_LIMIT_MESSAGE));
    return;
  }

  next();
};
