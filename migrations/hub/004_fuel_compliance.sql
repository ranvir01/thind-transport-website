-- Phase 3 — Fuel, IFTA, compliance, maintenance, incidents/claims, integration syncs.

CREATE TABLE IF NOT EXISTS hub.fuel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  card_program TEXT,
  truck_id UUID REFERENCES hub.trucks(id),
  driver_id UUID REFERENCES hub.drivers(id),
  ts TIMESTAMPTZ NOT NULL,
  merchant TEXT,
  city TEXT,
  jurisdiction TEXT,
  gallons NUMERIC(10,3) NOT NULL DEFAULT 0,
  fuel_type TEXT,
  unit_price_cents INTEGER,
  total_cents INTEGER NOT NULL DEFAULT 0,
  odometer NUMERIC(10,1),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, source, external_id)
);

CREATE INDEX IF NOT EXISTS fuel_truck_ts_idx ON hub.fuel_transactions(truck_id, ts);
CREATE INDEX IF NOT EXISTS fuel_carrier_ts_idx ON hub.fuel_transactions(carrier_id, ts);

CREATE TABLE IF NOT EXISTS hub.toll_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  transponder TEXT,
  truck_id UUID REFERENCES hub.trucks(id),
  ts TIMESTAMPTZ NOT NULL,
  plaza TEXT,
  jurisdiction TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, source, external_id)
);

-- Jurisdiction miles per computation run (recompute = new run id; never edited)
CREATE TABLE IF NOT EXISTS hub.jurisdiction_miles (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  run_id UUID NOT NULL,
  truck_id UUID NOT NULL REFERENCES hub.trucks(id),
  quarter TEXT NOT NULL, -- e.g. 2026Q2
  jurisdiction TEXT NOT NULL,
  miles NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL DEFAULT 'pings' CHECK (source IN ('pings','import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jmiles_quarter_idx ON hub.jurisdiction_miles(carrier_id, quarter, run_id);

CREATE TABLE IF NOT EXISTS hub.ifta_tax_rates (
  jurisdiction TEXT NOT NULL,
  quarter TEXT NOT NULL,
  rate NUMERIC(8,4) NOT NULL,
  surcharge_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (jurisdiction, quarter)
);

CREATE TABLE IF NOT EXISTS hub.ifta_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  quarter TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','filed')),
  run_id UUID,
  mileage_source TEXT,
  fleet_miles NUMERIC(14,2),
  fleet_gallons NUMERIC(14,3),
  mpg NUMERIC(8,4),
  net_tax_cents INTEGER,
  report JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, quarter)
);

CREATE TABLE IF NOT EXISTS hub.compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('driver','truck','trailer','company')),
  entity_id UUID,
  kind TEXT NOT NULL,
  due_on DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','waived')),
  note TEXT,
  document_id UUID REFERENCES hub.documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS compliance_due_idx ON hub.compliance_items(carrier_id, due_on);

CREATE TABLE IF NOT EXISTS hub.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  truck_id UUID NOT NULL REFERENCES hub.trucks(id),
  name TEXT NOT NULL,
  interval_miles INTEGER,
  interval_days INTEGER,
  last_done_on DATE,
  last_done_odometer NUMERIC(10,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  truck_id UUID NOT NULL REFERENCES hub.trucks(id),
  schedule_id UUID REFERENCES hub.maintenance_schedules(id),
  done_on DATE NOT NULL,
  odometer NUMERIC(10,1),
  vendor TEXT,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  receipt_document_id UUID REFERENCES hub.documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  truck_id UUID REFERENCES hub.trucks(id),
  driver_id UUID REFERENCES hub.drivers(id),
  load_id UUID REFERENCES hub.loads(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  description TEXT,
  police_report TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  incident_id UUID REFERENCES hub.incidents(id),
  load_id UUID REFERENCES hub.loads(id),
  kind TEXT NOT NULL CHECK (kind IN ('cargo','property','injury')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','filed','settled','denied','closed')),
  amount_cents INTEGER,
  filing_deadline DATE, -- Carmack: delivery + 9 months for cargo claims
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.integration_syncs (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID REFERENCES hub.carriers(id),
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  ok BOOLEAN,
  counts JSONB,
  error TEXT
);
