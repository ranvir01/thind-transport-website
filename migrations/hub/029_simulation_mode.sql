-- Simulation mode as the default running state of HaulDesk.
-- platform_state is a singleton: mode simulation|legit, the current sim seed,
-- and the optional simulated clock. email_outbox is the in-app echo so nothing
-- real leaves while mode = simulation. Truck ELD/fuel-card labels, SAMPLE
-- authority on a carrier, and an owner-only sim view override live here too.

CREATE TABLE IF NOT EXISTS hub.platform_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'simulation' CHECK (mode IN ('simulation', 'legit')),
  sim_seed TEXT,
  sim_clock_date DATE,
  generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO hub.platform_state (id, mode)
VALUES (1, 'simulation')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS hub.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES hub.carriers(id) ON DELETE SET NULL,
  to_addr TEXT NOT NULL,
  from_addr TEXT,
  cc_addr TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  attachments_meta JSONB NOT NULL DEFAULT '[]',
  kind TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_outbox_created_idx ON hub.email_outbox (created_at DESC);

ALTER TABLE hub.trucks ADD COLUMN IF NOT EXISTS eld_device_id TEXT;
ALTER TABLE hub.trucks ADD COLUMN IF NOT EXISTS fuel_card_last4 TEXT;

ALTER TABLE hub.carriers ADD COLUMN IF NOT EXISTS sample_authority BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE hub.users ADD COLUMN IF NOT EXISTS sim_view TEXT
  CHECK (sim_view IS NULL OR sim_view IN ('thind', 'ats', 'all'));
