export const CREATE_PASSWORD_RESET_TOKENS = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)`;

export const CREATE_PASSWORD_RESET_TOKENS_INDEX = `
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens(user_id, created_at DESC)`;
