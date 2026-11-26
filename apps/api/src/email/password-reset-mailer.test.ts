import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emailConfigFromEnv, resolveEmailTransport } from './password-reset-mailer.js';

describe('email provider selection', () => {
  it('skips sending when no provider is configured', () => {
    assert.equal(resolveEmailTransport({}), null);
    assert.equal(
      resolveEmailTransport({
        appPublicUrl: 'https://app.aureafinanzas.com',
        emailFrom: 'Áurea <no-reply@aureafinanzas.com>'
      }),
      null
    );
    assert.equal(
      resolveEmailTransport({
        resendApiKey: 're_test',
        emailFrom: 'Áurea <no-reply@aureafinanzas.com>'
      }),
      null
    );
  });

  it('prefers Resend when both providers are configured', () => {
    const transport = resolveEmailTransport({
      appPublicUrl: 'https://app.aureafinanzas.com',
      emailFrom: 'Áurea <no-reply@aureafinanzas.com>',
      resendApiKey: 're_test',
      smtpHost: 'smtp.example.com'
    });
    assert.equal(transport?.kind, 'resend');
  });

  it('uses SMTP when Resend is absent', () => {
    const transport = resolveEmailTransport({
      appPublicUrl: 'https://app.aureafinanzas.com',
      emailFrom: 'Áurea <no-reply@aureafinanzas.com>',
      smtpHost: 'smtp.example.com',
      smtpPort: 465
    });
    assert.equal(transport?.kind, 'smtp');
    if (transport?.kind === 'smtp') {
      assert.equal(transport.secure, true);
      assert.equal(transport.port, 465);
    }
  });

  it('treats blank env vars as unset', () => {
    const config = emailConfigFromEnv({
      APP_PUBLIC_URL: '  ',
      EMAIL_FROM: '',
      RESEND_API_KEY: '   ',
      SMTP_HOST: '',
      SMTP_PORT: ''
    });
    assert.equal(resolveEmailTransport(config), null);
  });
});
