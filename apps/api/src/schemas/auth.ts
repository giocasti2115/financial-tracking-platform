import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(320)
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'El enlace no es válido o expiró.').max(200),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(200)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
