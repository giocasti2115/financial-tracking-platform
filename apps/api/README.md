# API Service

## Scripts
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm start`

## Environment
Copy `.env.example` to `.env` and update values.

The API still boots if the mail variables are missing. Password reset then answers with the same generic message and does not send mail. Set these on the Railway service that runs `apps/api` (not on Vercel):

- `APP_PUBLIC_URL` — public web origin used in the link, e.g. `https://app.aureafinanzas.com`
- `EMAIL_FROM` — sender, e.g. `Áurea Finanzas <no-reply@aureafinanzas.com>`
- `RESEND_API_KEY` — if this is set (with the two values above), mail goes through Resend
- `SMTP_HOST` — used only when `RESEND_API_KEY` is empty
- `SMTP_PORT` — optional, default `587` (`465` turns on implicit TLS)
- `SMTP_USER` — optional SMTP auth user
- `SMTP_PASS` — optional SMTP auth password
- `SMTP_SECURE` — optional `true` to force TLS

Resend wins when both providers are configured. The reset link keeps the one-time token in the URL fragment (`#token=`), not in the query string. Login, forgot-password and reset-password are limited per process: 10 logins, 5 reset requests and 5 reset confirmations per 15 minutes. A second Railway replica has its own counter.

The `password_reset_tokens` table is created on the first reset request. The database user needs permission to `CREATE TABLE`, which this API already uses for other tables. `scripts/01-create-tables.sql` contains the same statement if you prefer to apply it yourself.
