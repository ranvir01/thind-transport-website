-- Phase pack retrofit: multi-tenancy, integer-cents money, unified load_events,
-- share links, import templates, geocode cache.
-- Thind is tenant #1 with a fixed UUID so later migrations/seeds can reference it.

-- ---- Tenancy ----

CREATE TABLE IF NOT EXISTS hub.carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dot_number TEXT,
  mc_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.carrier_settings (
  carrier_id UUID PRIMARY KEY REFERENCES hub.carriers(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thind Transport: tenant #1 (facts mirror src/lib/constants.ts at migration time;
-- the Hub reads carrier_settings from here on, never constants directly).
INSERT INTO hub.carriers (id, name, dot_number, mc_number, phone, email, address)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Thind Transport', '2523064', '876103', '(206) 765-6300',
  'thindcarrier@gmail.com', 'PO Box 5114, Kent, WA 98064'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hub.carrier_settings (carrier_id, settings)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '{
    "invoice": { "prefix": "THD-INV-", "nextNumber": 1001, "defaultTermsDays": 30 },
    "pay": { "companyDriverPerMile": 0.63, "ownerOperatorPercentage": 0.90, "payLoadedMilesOnly": true },
    "detention": { "freeHours": 2, "ratePerHourCents": 6000 },
    "costPerMileCents": 185,
    "fsc": { "baseCentsPerGallon": 125, "mpg": 6.0 },
    "randomTesting": { "drugPct": 50, "alcoholPct": 10 },
    "factoring": { "company": null, "remitName": null, "remitAddress": null, "email": null },
    "notifications": { "officeEmail": "thindcarrier@gmail.com" }
  }'::jsonb
)
ON CONFLICT (carrier_id) DO NOTHING;

-- ---- carrier_id on every business table (backfilled to Thind) ----

ALTER TABLE hub.users ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.drivers ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.trucks ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.trailers ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.customers ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.contacts ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.stops ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.documents ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.position_pings ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.crm_activities ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);
ALTER TABLE hub.audit_log ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);

UPDATE hub.users SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.drivers SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.trucks SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.trailers SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.customers SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.contacts SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.loads SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.stops SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.documents SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.position_pings SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.crm_activities SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;
UPDATE hub.audit_log SET carrier_id = '11111111-1111-1111-1111-111111111111' WHERE carrier_id IS NULL;

ALTER TABLE hub.drivers ALTER COLUMN carrier_id SET NOT NULL;
ALTER TABLE hub.trucks ALTER COLUMN carrier_id SET NOT NULL;
ALTER TABLE hub.trailers ALTER COLUMN carrier_id SET NOT NULL;
ALTER TABLE hub.customers ALTER COLUMN carrier_id SET NOT NULL;
ALTER TABLE hub.loads ALTER COLUMN carrier_id SET NOT NULL;

-- platform_admin reserved in the role enum
ALTER TABLE hub.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE hub.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner','dispatcher','accountant','driver','broker','shipper','platform_admin'));

-- Composite uniques (carrier_id, key)
ALTER TABLE hub.trucks DROP CONSTRAINT IF EXISTS trucks_unit_number_key;
ALTER TABLE hub.trucks ADD CONSTRAINT trucks_carrier_unit_key UNIQUE (carrier_id, unit_number);
ALTER TABLE hub.trailers DROP CONSTRAINT IF EXISTS trailers_unit_number_key;
ALTER TABLE hub.trailers ADD CONSTRAINT trailers_carrier_unit_key UNIQUE (carrier_id, unit_number);
ALTER TABLE hub.loads DROP CONSTRAINT IF EXISTS loads_reference_key;
ALTER TABLE hub.loads ADD CONSTRAINT loads_carrier_reference_key UNIQUE (carrier_id, reference);

-- ---- Money to integer cents ----

ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS linehaul_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS fuel_surcharge_cents INTEGER NOT NULL DEFAULT 0;
UPDATE hub.loads SET
  linehaul_cents = ROUND(linehaul * 100)::int,
  fuel_surcharge_cents = ROUND(fuel_surcharge * 100)::int;
ALTER TABLE hub.loads DROP COLUMN IF EXISTS linehaul;
ALTER TABLE hub.loads DROP COLUMN IF EXISTS fuel_surcharge;

UPDATE hub.loads SET accessorials = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object(
     'label', e->>'label',
     'amount_cents', ROUND((e->>'amount')::numeric * 100)::int))
   FROM jsonb_array_elements(accessorials) e),
  '[]'::jsonb)
WHERE jsonb_typeof(accessorials) = 'array' AND jsonb_array_length(accessorials) > 0
  AND NOT (accessorials->0 ? 'amount_cents');

ALTER TABLE hub.customers ADD COLUMN IF NOT EXISTS credit_limit_cents INTEGER;
UPDATE hub.customers SET credit_limit_cents = ROUND(credit_limit * 100)::int WHERE credit_limit IS NOT NULL;
ALTER TABLE hub.customers DROP COLUMN IF EXISTS credit_limit;

-- Load extras for the phase pack
ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS factored BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hub.loads DROP CONSTRAINT IF EXISTS loads_source_check;
ALTER TABLE hub.loads ADD CONSTRAINT loads_source_check
  CHECK (source IN ('dat','direct','import','quote'));

-- Stops: appointment vs FCFS, references
ALTER TABLE hub.stops ADD COLUMN IF NOT EXISTS fcfs BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hub.stops ADD COLUMN IF NOT EXISTS pickup_number TEXT;
ALTER TABLE hub.stops ADD COLUMN IF NOT EXISTS po_number TEXT;

-- Drivers: settlement deduction config
ALTER TABLE hub.drivers ADD COLUMN IF NOT EXISTS escrow_weekly_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub.drivers ADD COLUMN IF NOT EXISTS insurance_weekly_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub.drivers ADD COLUMN IF NOT EXISTS pay_loaded_miles_only BOOLEAN NOT NULL DEFAULT TRUE;

-- Trucks: tank capacity for fuel fraud flags (Phase 3)
ALTER TABLE hub.trucks ADD COLUMN IF NOT EXISTS tank_capacity_gallons INTEGER;

-- ---- Unified load_events timeline (replaces load_status_events) ----

CREATE TABLE IF NOT EXISTS hub.load_events (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  load_id UUID NOT NULL REFERENCES hub.loads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'status_change','check_call','geo','document','note','weather_alert','detention','exception'
  )),
  actor_id UUID,
  actor_name TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS load_events_load_idx ON hub.load_events(load_id, created_at);

INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload, created_at)
SELECT l.carrier_id, e.load_id, 'status_change', e.actor_id, e.actor_name,
       jsonb_build_object('from', e.from_status, 'to', e.to_status), e.created_at
FROM hub.load_status_events e
JOIN hub.loads l ON l.id = e.load_id;

DROP TABLE IF EXISTS hub.load_status_events;

-- ---- Share links, import templates, geocode cache ----

CREATE TABLE IF NOT EXISTS hub.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  load_id UUID NOT NULL REFERENCES hub.loads(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_by UUID,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  kind TEXT NOT NULL CHECK (kind IN ('loads','fuel','tolls','positions')),
  name TEXT NOT NULL,
  mapping JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, kind, name)
);

CREATE TABLE IF NOT EXISTS hub.geocode_cache (
  query TEXT PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
