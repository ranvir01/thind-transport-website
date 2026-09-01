-- Credential-gated live integration setup. Secrets are encrypted by the app
-- with CREDENTIALS_KEY before storage. CSV/manual import remains default.

CREATE TABLE IF NOT EXISTS hub.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  data_mode TEXT NOT NULL DEFAULT 'production' CHECK (data_mode IN ('production','sandbox')),
  provider TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','configured','disabled')),
  metadata JSONB NOT NULL DEFAULT '{}',
  encrypted_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, provider, label)
);
