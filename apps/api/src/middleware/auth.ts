import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import { env } from '../env.js';

export interface AuthContext {
  userId: string;
  sessionId?: string;
  roles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(createError(401, 'Missing bearer token'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthContext;
    req.auth = payload;
    return next();
  } catch (error) {
    return next(createError(401, 'Invalid or expired token'));
  }
};
