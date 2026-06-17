CREATE TABLE IF NOT EXISTS hub.saved_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  data_mode TEXT NOT NULL DEFAULT 'production' CHECK (data_mode IN ('production','sandbox')),
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  mapping JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, name)
);
