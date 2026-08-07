-- Two-factor auth (TOTP, RFC 6238) for hub users.
-- Secrets are stored ENCRYPTED with the same CREDENTIALS_KEY envelope the
-- integration credentials use (src/lib/hub/credentials.ts) — never plaintext.
-- Recovery codes are stored only as SHA-256 hashes; the plaintext is shown
-- exactly once at enrollment.
-- pending vs enabled: enrollment writes the pending column first, and only a
-- successfully verified code promotes it — a half-finished enrollment can
-- never lock a user out.

ALTER TABLE hub.users ADD COLUMN IF NOT EXISTS totp_secret_enc TEXT;
ALTER TABLE hub.users ADD COLUMN IF NOT EXISTS totp_pending_secret_enc TEXT;
ALTER TABLE hub.users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;
ALTER TABLE hub.users ADD COLUMN IF NOT EXISTS totp_recovery_hashes JSONB NOT NULL DEFAULT '[]'::jsonb;
