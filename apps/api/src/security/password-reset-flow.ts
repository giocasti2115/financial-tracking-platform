import createError from 'http-errors';
import {
  GENERIC_RESET_MESSAGE,
  INVALID_RESET_MESSAGE,
  createResetToken,
  hashResetToken
} from './reset-token.js';

export type SqlClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

export type PasswordResetIssueDeps = {
  findUserByEmail: (email: string) => Promise<{ id: string } | null>;
  storeResetToken: (userId: string, tokenHash: string, expiresAt: Date) => Promise<void>;
  sendResetEmail: (input: { to: string; rawToken: string }) => Promise<'sent' | 'skipped'>;
  log: (message: string) => void;
  now?: () => Date;
};

export async function issuePasswordReset(
  deps: PasswordResetIssueDeps,
  email: string
): Promise<{ message: string }> {
  const normalized = email.trim().toLowerCase();
  let user: { id: string } | null = null;

  try {
    user = await deps.findUserByEmail(normalized);
  } catch {
    deps.log('password reset lookup failed');
    return { message: GENERIC_RESET_MESSAGE };
  }

  if (!user) {
    return { message: GENERIC_RESET_MESSAGE };
  }

  const token = createResetToken(deps.now?.() ?? new Date());

  try {
    await deps.storeResetToken(user.id, token.hash, token.expiresAt);
  } catch {
    deps.log('password reset token store failed');
    return { message: GENERIC_RESET_MESSAGE };
  }

  try {
    const delivery = await deps.sendResetEmail({ to: normalized, rawToken: token.raw });
    if (delivery === 'skipped') {
      deps.log('password reset email skipped: provider or APP_PUBLIC_URL is not configured');
    }
  } catch {
    deps.log('password reset email failed');
  }

  return { message: GENERIC_RESET_MESSAGE };
}

export class InvalidResetTokenError extends Error {
  constructor() {
    super(INVALID_RESET_MESSAGE);
  }
}

export async function completePasswordReset(
  client: SqlClient,
  input: { tokenHash: string; newPasswordHash: string }
) {
  const consumed = await client.query(
    `UPDATE password_reset_tokens
        SET used_at = NOW()
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING user_id`,
    [input.tokenHash]
  );

  const userId = consumed.rows[0]?.user_id;
  if (typeof userId !== 'string' || !userId) {
    throw new InvalidResetTokenError();
  }

  await client.query(
    `UPDATE users
        SET password_hash = $1,
            temp_password_hash = NULL,
            temp_password_expires_at = NULL,
            updated_at = NOW()
      WHERE id = $2`,
    [input.newPasswordHash, userId]
  );

  await client.query(
    `UPDATE refresh_tokens
        SET revoked = true
      WHERE user_id = $1
        AND revoked = false`,
    [userId]
  );

  await client.query(
    `UPDATE user_sessions
        SET expires_at = NOW()
      WHERE user_id = $1
        AND expires_at > NOW()`,
    [userId]
  );
}

export const invalidResetHttpError = () => createError(400, INVALID_RESET_MESSAGE);

export { hashResetToken };
