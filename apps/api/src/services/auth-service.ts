import { randomBytes, createHash } from 'crypto';
import createError from 'http-errors';
import jwt from 'jsonwebtoken';
import { deliverPasswordResetEmail, emailConfigFromEnv } from '../email/password-reset-mailer.js';
import { env } from '../env.js';
import { db, query } from '../lib/db.js';
import { comparePassword, hashPassword } from '../lib/password.js';
import {
  CREATE_PASSWORD_RESET_TOKENS,
  CREATE_PASSWORD_RESET_TOKENS_INDEX
} from '../security/password-reset-table.js';
import {
  completePasswordReset,
  InvalidResetTokenError,
  issuePasswordReset
} from '../security/password-reset-flow.js';
import { GENERIC_RESET_MESSAGE, INVALID_RESET_MESSAGE, hashResetToken } from '../security/reset-token.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MINUTES = 60 * 24 * 7;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

let passwordResetTableEnsured = false;

const ensurePasswordResetTable = async () => {
  if (passwordResetTableEnsured) return;
  await query(CREATE_PASSWORD_RESET_TOKENS);
  await query(CREATE_PASSWORD_RESET_TOKENS_INDEX);
  passwordResetTableEnsured = true;
};

const logReset = (message: string) => {
  console.warn(`[auth] ${message}`);
};

const signAccessToken = (payload: { userId: string; sessionId: string }) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  temp_password_hash: string | null;
  temp_password_expires_at: Date | null;
};

export const AuthService = {
  register: async (
    input: { fullName: string; email: string; password: string },
    meta?: { ip?: string | string[]; userAgent?: string }
  ) => {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();

    const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    if ((existing.rowCount ?? 0) > 0) {
      throw createError(409, 'Ya existe una cuenta con este correo.');
    }

    const passwordHash = await hashPassword(input.password);
    await query(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES ($1, $2, $3)` ,
      [email, fullName || null, passwordHash]
    );

    return AuthService.login(email, input.password, meta);
  },

  login: async (
    email: string,
    password: string,
    meta?: { ip?: string | string[]; userAgent?: string }
  ) => {
    const ip = Array.isArray(meta?.ip) ? meta?.ip[0] : meta?.ip;
    const userResult = await query<DbUser>(
      `SELECT id, email, password_hash, full_name, temp_password_hash, temp_password_expires_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = userResult.rows[0];
    if (!user) {
      throw createError(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw createError(401, 'Invalid credentials');
    }

    const sessionResult = await query<{ id: string }>(
      `INSERT INTO user_sessions (user_id, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::INTERVAL)
       RETURNING id`,
      [user.id, ip ?? null, meta?.userAgent ?? null, REFRESH_TOKEN_TTL_MINUTES]
    );

    const sessionId = sessionResult.rows[0].id;
    const accessToken = signAccessToken({ userId: user.id, sessionId });
    const refreshToken = randomBytes(48).toString('hex');
    const refreshHash = hashToken(refreshToken);

    await query(
      `INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::INTERVAL)` ,
      [user.id, sessionId, refreshHash, REFRESH_TOKEN_TTL_MINUTES]
    );

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.full_name ?? undefined
    };

    return { accessToken, refreshToken, user: userPayload };
  },

  refresh: async (token: string) => {
    const hashed = hashToken(token);
    const result = await query<{ id: string; user_id: string; session_id: string }>(
      `SELECT id, user_id, session_id
       FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked = false
         AND expires_at > NOW()` ,
      [hashed]
    );

    const stored = result.rows[0];
    if (!stored) {
      throw createError(401, 'Refresh token invalid');
    }

    const accessToken = signAccessToken({ userId: stored.user_id, sessionId: stored.session_id });

    return { accessToken };
  },

  requestPasswordReset: async (email: string) => {
    try {
      await ensurePasswordResetTable();
    } catch {
      logReset('password reset table is unavailable');
      return { message: GENERIC_RESET_MESSAGE };
    }

    return issuePasswordReset(
      {
        findUserByEmail: async (normalized) => {
          const userResult = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [normalized]);
          return userResult.rows[0] ?? null;
        },
        storeResetToken: async (userId, tokenHash, expiresAt) => {
          const client = await db.connect();
          try {
            await client.query('BEGIN');
            await client.query(
              `UPDATE password_reset_tokens
                  SET used_at = NOW()
                WHERE user_id = $1
                  AND used_at IS NULL`,
              [userId]
            );
            await client.query(
              `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
               VALUES ($1, $2, $3)`,
              [userId, tokenHash, expiresAt.toISOString()]
            );
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        },
        sendResetEmail: (input) => deliverPasswordResetEmail(emailConfigFromEnv(), input),
        log: logReset
      },
      email
    );
  },

  resetPassword: async (input: { token: string; newPassword: string }) => {
    await ensurePasswordResetTable();
    const newPasswordHash = await hashPassword(input.newPassword);
    const client = await db.connect();

    try {
      await client.query('BEGIN');
      await completePasswordReset(client, {
        tokenHash: hashResetToken(input.token),
        newPasswordHash
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof InvalidResetTokenError) {
        throw createError(400, INVALID_RESET_MESSAGE);
      }
      throw error;
    } finally {
      client.release();
    }
  }
};
