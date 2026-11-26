import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAuthRateLimiter } from './rate-limit.js';

describe('auth rate limiter', () => {
  it('blocks login after 10 attempts from the same IP and frees the window later', () => {
    let now = 0;
    const limiter = createAuthRateLimiter(() => now);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = limiter.consume({ scope: 'login', ip: '203.0.113.4', email: `user${attempt}@example.com` });
      assert.equal(result.allowed, true);
    }

    const blocked = limiter.consume({ scope: 'login', ip: '203.0.113.4', email: 'other@example.com' });
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0);

    now = 15 * 60 * 1000 + 1;
    const afterWindow = limiter.consume({ scope: 'login', ip: '203.0.113.4', email: 'other@example.com' });
    assert.equal(afterWindow.allowed, true);
  });

  it('limits forgot-password by email even when the IP changes', () => {
    const limiter = createAuthRateLimiter(() => 1_000);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal(
        limiter.consume({ scope: 'forgot', ip: `198.51.100.${attempt}`, email: 'Ana@Example.com' }).allowed,
        true
      );
    }

    const blocked = limiter.consume({ scope: 'forgot', ip: '198.51.100.50', email: 'ana@example.com' });
    assert.equal(blocked.allowed, false);
  });

  it('does not count a rejected attempt twice when the email limit is already spent', () => {
    let now = 0;
    const limiter = createAuthRateLimiter(() => now);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.consume({ scope: 'forgot', ip: `198.51.100.${attempt}`, email: 'ana@example.com' });
    }

    limiter.consume({ scope: 'forgot', ip: '203.0.113.9', email: 'ana@example.com' });
    now = 15 * 60 * 1000 + 1;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal(
        limiter.consume({ scope: 'forgot', ip: '203.0.113.9', email: 'someone-else@example.com' }).allowed,
        true
      );
    }
  });
});
