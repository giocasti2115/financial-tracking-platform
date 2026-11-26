import { resetLinkForToken } from '../security/reset-token.js';

export type EmailConfig = {
  appPublicUrl?: string;
  emailFrom?: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
};

export type EmailTransport =
  | { kind: 'resend'; apiKey: string; from: string; appPublicUrl: string }
  | {
      kind: 'smtp';
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
      from: string;
      appPublicUrl: string;
    };

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export function emailConfigFromEnv(source: NodeJS.ProcessEnv = process.env): EmailConfig {
  const port = Number(source.SMTP_PORT);
  return {
    appPublicUrl: clean(source.APP_PUBLIC_URL),
    emailFrom: clean(source.EMAIL_FROM),
    resendApiKey: clean(source.RESEND_API_KEY),
    smtpHost: clean(source.SMTP_HOST),
    smtpPort: Number.isFinite(port) && port > 0 ? port : undefined,
    smtpUser: clean(source.SMTP_USER),
    smtpPass: source.SMTP_PASS,
    smtpSecure: clean(source.SMTP_SECURE) === 'true'
  };
}

const isHttpUrl = (value: string | undefined): value is string => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export function resolveEmailTransport(config: EmailConfig): EmailTransport | null {
  if (!isHttpUrl(config.appPublicUrl) || !config.emailFrom) {
    return null;
  }

  if (config.resendApiKey) {
    return {
      kind: 'resend',
      apiKey: config.resendApiKey,
      from: config.emailFrom,
      appPublicUrl: config.appPublicUrl
    };
  }

  if (config.smtpHost) {
    const port = config.smtpPort ?? 587;
    return {
      kind: 'smtp',
      host: config.smtpHost,
      port,
      secure: config.smtpSecure ?? port === 465,
      user: config.smtpUser,
      pass: config.smtpPass,
      from: config.emailFrom,
      appPublicUrl: config.appPublicUrl
    };
  }

  return null;
}

const subject = 'Restablece tu contraseña de Áurea Finanzas';

const messageBody = (resetUrl: string) => ({
  text: [
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Áurea Finanzas.',
    '',
    'Abre este enlace en los próximos 30 minutos. Solo se puede usar una vez:',
    resetUrl,
    '',
    'Si no fuiste tú, ignora este correo. Tu contraseña no cambiará.'
  ].join('\n'),
  html: `<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de Áurea Finanzas.</p>
<p><a href="${resetUrl}">Restablecer contraseña</a></p>
<p>El enlace vence en 30 minutos y solo se puede usar una vez.</p>
<p>Si no fuiste tú, ignora este correo. Tu contraseña no cambiará.</p>`
});

export async function deliverPasswordResetEmail(
  config: EmailConfig,
  input: { to: string; rawToken: string }
): Promise<'sent' | 'skipped'> {
  const transport = resolveEmailTransport(config);
  if (!transport) return 'skipped';

  const resetUrl = resetLinkForToken(transport.appPublicUrl, input.rawToken);
  const body = messageBody(resetUrl);

  if (transport.kind === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${transport.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: transport.from,
        to: [input.to],
        subject,
        text: body.text,
        html: body.html
      })
    });

    if (!response.ok) {
      throw new Error(`email provider status ${response.status}`);
    }
    return 'sent';
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: transport.host,
    port: transport.port,
    secure: transport.secure,
    auth: transport.user ? { user: transport.user, pass: transport.pass ?? '' } : undefined
  });

  await transporter.sendMail({
    from: transport.from,
    to: input.to,
    subject,
    text: body.text,
    html: body.html
  });

  return 'sent';
}
