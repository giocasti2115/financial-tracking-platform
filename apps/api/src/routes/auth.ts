import { Router } from 'express';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth.js';
import { AuthService } from '../services/auth-service.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const tokens = await AuthService.login(body.email, body.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json(tokens);
  })
);

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const tokens = await AuthService.register(
      { fullName: body.fullName, email: body.email, password: body.password },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    res.status(201).json(tokens);
  })
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body);
    const tokens = await AuthService.refresh(body.refreshToken);
    res.json(tokens);
  })
);
