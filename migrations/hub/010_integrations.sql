-- Phase 6 — live integrations: encrypted per-carrier credentials, HOS
-- snapshots from the ELD sync (display-only — the ELD is the legal record).

CREATE TABLE IF NOT EXISTS hub.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  provider TEXT NOT NULL CHECK (provider IN ('terminal','truckercloud','dat','efs','wex','comdata','mailbox')),
  -- AES-256-GCM envelope: iv:tag:ciphertext (base64), keyed by CREDENTIALS_KEY env.
  encrypted TEXT NOT NULL,
  label TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, provider)
);

CREATE TABLE IF NOT EXISTS hub.hos_snapshots (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id),
  ts TIMESTAMPTZ NOT NULL,
  duty_status TEXT,
  drive_remaining_minutes INTEGER,
  shift_remaining_minutes INTEGER,
  cycle_remaining_minutes INTEGER,
  source TEXT NOT NULL DEFAULT 'telematics',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hos_driver_ts_idx ON hub.hos_snapshots(carrier_id, driver_id, ts DESC);
