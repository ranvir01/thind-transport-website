-- Integrations v2: unblock provider scaling + inbound webhooks.
--
-- 1. api_credentials.provider had a CHECK enumerating exactly 7 providers,
--    forcing a migration for EVERY new integration. The registry
--    (src/lib/hub/integrations/registry.ts) is now the allowlist enforced in
--    the server action; the DB keeps a sane shape constraint only.
-- 2. integration_events stores verified inbound webhook payloads idempotently
--    (replays collapse on the unique key) for async processing.

ALTER TABLE hub.api_credentials DROP CONSTRAINT IF EXISTS api_credentials_provider_check;
ALTER TABLE hub.api_credentials
  ADD CONSTRAINT api_credentials_provider_shape CHECK (provider ~ '^[a-z][a-z0-9_-]{1,39}$');

CREATE TABLE IF NOT EXISTS hub.integration_events (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  kind TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (carrier_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS integration_events_pending_idx
  ON hub.integration_events(carrier_id, provider)
  WHERE processed_at IS NULL;
