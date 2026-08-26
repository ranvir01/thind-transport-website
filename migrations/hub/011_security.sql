-- Phase 7 — security pass: serverless-safe login throttling.
-- Five failed attempts on an email within 15 minutes locks it for 15 minutes.

CREATE TABLE IF NOT EXISTS hub.auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_attempts_email_idx ON hub.auth_attempts(email, attempted_at DESC);
