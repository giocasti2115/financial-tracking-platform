import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GENERIC_RESET_MESSAGE,
  RESET_TOKEN_TTL_MS,
  createResetToken,
  hashResetToken,
  resetLinkForToken
} from './reset-token.js';

describe('reset tokens', () => {
  it('stores a hash that is not the raw token', () => {
    const token = createResetToken(new Date('2026-01-01T00:00:00.000Z'));
    assert.notEqual(token.hash, token.raw);
    assert.equal(token.hash, hashResetToken(token.raw));
    assert.equal(token.expiresAt.toISOString(), '2026-01-01T00:30:00.000Z');
    assert.equal(RESET_TOKEN_TTL_MS, 30 * 60 * 1000);
    assert.equal(token.raw.includes('+'), false);
    assert.equal(token.raw.includes('/'), false);
  });

  it('puts the secret in the URL fragment, not the query string', () => {
    const link = resetLinkForToken('https://app.aureafinanzas.com/', 'abc+token');
    const url = new URL(link);
    assert.equal(url.search, '');
    assert.equal(url.hash, '#token=abc%2Btoken');
    assert.equal(url.origin + url.pathname, 'https://app.aureafinanzas.com/reset-password');
  });

  it('keeps the public message free of secrets', () => {
    assert.equal(GENERIC_RESET_MESSAGE.includes('temporaryPassword'), false);
    assert.equal(GENERIC_RESET_MESSAGE.toLowerCase().includes('token'), false);
  });
});
