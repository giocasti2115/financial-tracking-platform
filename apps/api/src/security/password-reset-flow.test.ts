import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  completePasswordReset,
  InvalidResetTokenError,
  issuePasswordReset
} from './password-reset-flow.js';
import { GENERIC_RESET_MESSAGE, hashResetToken } from './reset-token.js';
import type { SqlClient } from './password-reset-flow.js';

describe('password reset flow', () => {
  it('returns the same message whether the email exists, and never returns the token', async () => {
    const stored: Array<{ userId: string; tokenHash: string }> = [];
    const sent: string[] = [];

    const missing = await issuePasswordReset(
      {
        findUserByEmail: async () => null,
        storeResetToken: async () => {
          throw new Error('should not store');
        },
        sendResetEmail: async () => {
          throw new Error('should not send');
        },
        log: () => undefined
      },
      'missing@example.com'
    );

    const present = await issuePasswordReset(
      {
        findUserByEmail: async () => ({ id: 'user-1' }),
        storeResetToken: async (userId, tokenHash) => {
          stored.push({ userId, tokenHash });
        },
        sendResetEmail: async ({ rawToken }) => {
          sent.push(rawToken);
          return 'skipped';
        },
        log: () => undefined
      },
      'Owner@Example.com'
    );

    assert.deepEqual(missing, { message: GENERIC_RESET_MESSAGE });
    assert.deepEqual(present, { message: GENERIC_RESET_MESSAGE });
    assert.equal(JSON.stringify(present).includes('temporaryPassword'), false);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].userId, 'user-1');
    assert.notEqual(stored[0].tokenHash, sent[0]);
    assert.equal(stored[0].tokenHash, hashResetToken(sent[0]));
    assert.equal(JSON.stringify(present).includes(sent[0]), false);
  });

  it('still returns the generic message when storing the token fails', async () => {
    const logs: string[] = [];
    const result = await issuePasswordReset(
      {
        findUserByEmail: async () => ({ id: 'user-1' }),
        storeResetToken: async () => {
          throw new Error('db down');
        },
        sendResetEmail: async () => 'sent',
        log: (message) => logs.push(message)
      },
      'owner@example.com'
    );

    assert.deepEqual(result, { message: GENERIC_RESET_MESSAGE });
    assert.deepEqual(logs, ['password reset token store failed']);
    assert.equal(logs.join(' ').includes('db down'), false);
  });

  it('revokes refresh tokens and sessions when the password changes', async () => {
    const statements: string[] = [];
    const client: SqlClient = {
      query: async (text, params) => {
        statements.push(text);
        if (text.includes('password_reset_tokens')) {
          assert.equal(params?.[0], hashResetToken('raw-token'));
          return { rows: [{ user_id: 'user-1' }] };
        }
        if (text.includes('UPDATE users')) {
          assert.equal(params?.[0], 'hashed-password');
          assert.equal(params?.[1], 'user-1');
        }
        return { rows: [] };
      }
    };

    await completePasswordReset(client, {
      tokenHash: hashResetToken('raw-token'),
      newPasswordHash: 'hashed-password'
    });

    assert.equal(statements.some((sql) => sql.includes('UPDATE refresh_tokens') && sql.includes('revoked = true')), true);
    assert.equal(statements.some((sql) => sql.includes('UPDATE user_sessions') && sql.includes('expires_at = NOW()')), true);
    assert.equal(statements.some((sql) => sql.includes('temp_password_hash = NULL')), true);
  });

  it('does not change the password when the token was already used or is unknown', async () => {
    const client: SqlClient = {
      query: async (text) => {
        if (text.includes('UPDATE users')) {
          throw new Error('password update should not run');
        }
        return { rows: [] };
      }
    };

    await assert.rejects(
      () => completePasswordReset(client, { tokenHash: 'missing', newPasswordHash: 'hashed-password' }),
      InvalidResetTokenError
    );
  });
});
