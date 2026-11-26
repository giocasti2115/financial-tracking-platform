import { createHash, randomBytes } from 'crypto';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export const GENERIC_RESET_MESSAGE =
  'Si el correo está registrado, enviaremos un enlace para restablecer la contraseña.';

export const INVALID_RESET_MESSAGE = 'El enlace no es válido o expiró.';

export type ResetToken = {
  raw: string;
  hash: string;
  expiresAt: Date;
};

export const hashResetToken = (raw: string) => createHash('sha256').update(raw).digest('hex');

export const createResetToken = (now: Date = new Date()): ResetToken => {
  const raw = randomBytes(32).toString('base64url');
  return {
    raw,
    hash: hashResetToken(raw),
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS)
  };
};

export const resetLinkForToken = (appPublicUrl: string, rawToken: string) => {
  const base = appPublicUrl.replace(/\/$/, '');
  return `${base}/reset-password#token=${encodeURIComponent(rawToken)}`;
};
