-- Expansion retrofits + shared spines (binding expansion prompt, section A):
--   1. facilities extracted from stops (dedupe by geocode) + facility notes (E2 root)
--   2. fuel_transactions.fuel_use — reefer fuel is IFTA-exempt (correctness fix)
--   3. pay_rules — generic settlement evaluator seam (E13)
--   4. incidents gain 49 CFR 390.5 accident-qualifier flags (E11 accident register)
-- Plus the spines E1–E5 modules share: notifications + Web Push, tasks, message
-- threads/announcements/document requests, lanes, time-off requests, dispatch acks.

-- ---------------------------------------------------------------------------
-- Retrofit 1 — facilities (the root entity for facility intelligence)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hub.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  name TEXT NOT NULL,
  -- Stable identity: normalized name + geocode bucket (~1km) when available,
  -- else normalized city/state. Computed identically in SQL (below) and in
  -- src/lib/hub/facilities.ts so imports and UI creation dedupe the same way.
  dedupe_key TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  type TEXT NOT NULL DEFAULT 'both' CHECK (type IN ('shipper','receiver','both')),
  hours TEXT,
  phone TEXT,
  overnight_parking BOOLEAN,
  typical_lumper_cents INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS facilities_carrier_name_idx ON hub.facilities(carrier_id, name);

CREATE TABLE IF NOT EXISTS hub.facility_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  facility_id UUID NOT NULL REFERENCES hub.facilities(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  author_role TEXT,
  body TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]',
  document_id UUID REFERENCES hub.documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS facility_notes_facility_idx ON hub.facility_notes(facility_id, created_at DESC);

ALTER TABLE hub.stops ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES hub.facilities(id);
CREATE INDEX IF NOT EXISTS stops_facility_idx ON hub.stops(facility_id) WHERE facility_id IS NOT NULL;

-- Extract facilities from existing stops (dedupe by geocode bucket, else city/state).
INSERT INTO hub.facilities (carrier_id, name, dedupe_key, address, city, state, zip, lat, lng, type)
SELECT DISTINCT ON (s.carrier_id, k.dedupe_key)
  s.carrier_id,
  trim(s.facility),
  k.dedupe_key,
  s.address, s.city, s.state, s.zip, s.lat, s.lng,
  'both'
FROM hub.stops s
CROSS JOIN LATERAL (
  SELECT lower(trim(s.facility)) || '|' || CASE
    WHEN s.lat IS NOT NULL AND s.lng IS NOT NULL
      THEN round(s.lat::numeric, 2)::text || ',' || round(s.lng::numeric, 2)::text
    ELSE lower(coalesce(trim(s.city), '')) || ',' || lower(coalesce(trim(s.state), ''))
  END AS dedupe_key
) k
WHERE s.facility IS NOT NULL AND trim(s.facility) <> '' AND s.carrier_id IS NOT NULL
ORDER BY s.carrier_id, k.dedupe_key, s.created_at
ON CONFLICT (carrier_id, dedupe_key) DO NOTHING;

UPDATE hub.stops s
SET facility_id = f.id
FROM hub.facilities f
WHERE s.facility_id IS NULL
  AND s.facility IS NOT NULL AND trim(s.facility) <> ''
  AND f.carrier_id = s.carrier_id
  AND f.dedupe_key = lower(trim(s.facility)) || '|' || CASE
    WHEN s.lat IS NOT NULL AND s.lng IS NOT NULL
      THEN round(s.lat::numeric, 2)::text || ',' || round(s.lng::numeric, 2)::text
    ELSE lower(coalesce(trim(s.city), '')) || ',' || lower(coalesce(trim(s.state), ''))
  END;

-- Facility type from observed stop usage (pickup-only → shipper, delivery-only → receiver).
UPDATE hub.facilities f SET type = u.observed
FROM (
  SELECT facility_id,
    CASE WHEN bool_and(type = 'pickup') THEN 'shipper'
         WHEN bool_and(type = 'delivery') THEN 'receiver'
         ELSE 'both' END AS observed
  FROM hub.stops WHERE facility_id IS NOT NULL GROUP BY facility_id
) u
WHERE f.id = u.facility_id;

-- ---------------------------------------------------------------------------
-- Retrofit 2 — reefer fuel is not propulsion fuel (IFTA-exempt)
-- ---------------------------------------------------------------------------

ALTER TABLE hub.fuel_transactions ADD COLUMN IF NOT EXISTS fuel_use TEXT NOT NULL DEFAULT 'tractor'
  CHECK (fuel_use IN ('tractor','reefer','other'));

-- Classify existing rows from the pump product description.
UPDATE hub.fuel_transactions SET fuel_use = 'reefer'
WHERE fuel_use = 'tractor'
  AND (fuel_type ILIKE '%reefer%' OR fuel_type ILIKE '%rfr%' OR fuel_type ILIKE '%refrig%');

UPDATE hub.fuel_transactions SET fuel_use = 'other'
WHERE fuel_use = 'tractor'
  AND (fuel_type ILIKE 'def%' OR fuel_type ILIKE '%diesel exhaust%' OR fuel_type ILIKE '%additive%');

-- ---------------------------------------------------------------------------
-- Retrofit 3 — generic pay rules (settlement engine consumes the evaluator)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hub.pay_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID REFERENCES hub.drivers(id),  -- NULL = carrier default rule set
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  -- Earning rules, evaluated per load then per period:
  --   [{ "type": "per_mile", "rateCentsPerMile": 63, "loadedOnly": true },
  --    { "type": "percent_linehaul", "basisPoints": 9000 },
  --    { "type": "fsc_passthrough", "basisPoints": 10000 },
  --    { "type": "percent_accessorials", "basisPoints": 10000 },
  --    { "type": "flat_per_load", "amountCents": 5000 },
  --    { "type": "per_stop", "amountCents": 2500, "afterStops": 2 },
  --    { "type": "referral_bonus" }, { "type": "scorecard_bonus", "tiers": [...] }]
  rules JSONB NOT NULL DEFAULT '[]',
  -- Recurring deductions per period:
  --   [{ "kind": "escrow", "amountCents": 10000 }, { "kind": "insurance", "amountCents": 25000 },
  --    { "kind": "percent_of_gross", "label": "Admin fee", "basisPoints": 300 }]
  deductions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pay_rules_driver_idx ON hub.pay_rules(carrier_id, driver_id) WHERE active;

-- Seed per-driver rule sets from the legacy two-pay-type columns so existing
-- tenants keep settling identically through the new evaluator.
INSERT INTO hub.pay_rules (carrier_id, driver_id, name, rules, deductions)
SELECT
  d.carrier_id, d.id,
  CASE WHEN d.pay_type = 'percentage' THEN 'Owner-operator percentage' ELSE 'Company per-mile' END,
  CASE WHEN d.pay_type = 'percentage' THEN
    jsonb_build_array(
      jsonb_build_object('type','percent_linehaul','basisPoints', round(d.pay_rate * 10000)::int),
      jsonb_build_object('type','fsc_passthrough','basisPoints', 10000),
      jsonb_build_object('type','referral_bonus')
    )
  ELSE
    jsonb_build_array(
      jsonb_build_object('type','per_mile','rateCentsPerMile', round(d.pay_rate * 100)::int,
                         'loadedOnly', d.pay_loaded_miles_only),
      jsonb_build_object('type','referral_bonus')
    )
  END,
  (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('kind','escrow','amountCents', d.escrow_weekly_cents) AS x
    WHERE d.escrow_weekly_cents > 0
    UNION ALL
    SELECT jsonb_build_object('kind','insurance','amountCents', d.insurance_weekly_cents)
    WHERE d.insurance_weekly_cents > 0
  ) deductions)
FROM hub.drivers d
WHERE d.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM hub.pay_rules p WHERE p.driver_id = d.id);

-- ---------------------------------------------------------------------------
-- Retrofit 4 — 49 CFR 390.5 accident qualifiers on incidents
-- ---------------------------------------------------------------------------

ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS fatality BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS injury_treated_away BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS tow_away_disabling BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS dot_recordable BOOLEAN
  GENERATED ALWAYS AS (fatality OR injury_treated_away OR tow_away_disabling) STORED;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
  CHECK (status IN ('open','under_review','closed'));
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS reported_by UUID;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS reported_by_name TEXT;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS incidents_register_idx
  ON hub.incidents(carrier_id, occurred_at DESC) WHERE dot_recordable;

-- ---------------------------------------------------------------------------
-- Spine — notifications + Web Push
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hub.notifications (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  user_id UUID NOT NULL REFERENCES hub.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON hub.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON hub.notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS hub.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  user_id UUID NOT NULL REFERENCES hub.users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Spine — tasks & office workflow (E4)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hub.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  title TEXT NOT NULL,
  notes TEXT,
  assignee_user_id UUID REFERENCES hub.users(id),
  created_by UUID,
  created_by_name TEXT,
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  entity_type TEXT,
  entity_id TEXT,
  checklist JSONB NOT NULL DEFAULT '[]',  -- [{ "label": "...", "done": false }]
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekdays','weekly','monthly')),
  automation_key TEXT,
  completed_at TIMESTAMPTZ,
  completed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_automation_key_idx
  ON hub.tasks(carrier_id, automation_key) WHERE automation_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_open_idx
  ON hub.tasks(carrier_id, due_at) WHERE completed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Spine — communication hub (E3)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hub.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  kind TEXT NOT NULL CHECK (kind IN ('load','direct')),
  load_id UUID REFERENCES hub.loads(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES hub.drivers(id),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS message_threads_load_idx
  ON hub.message_threads(carrier_id, load_id) WHERE kind = 'load';
CREATE UNIQUE INDEX IF NOT EXISTS message_threads_direct_idx
  ON hub.message_threads(carrier_id, driver_id) WHERE kind = 'direct';

CREATE TABLE IF NOT EXISTS hub.messages (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  thread_id UUID NOT NULL REFERENCES hub.message_threads(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_name TEXT NOT NULL,
  sender_role TEXT,
  body TEXT NOT NULL DEFAULT '',
  document_id UUID REFERENCES hub.documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_thread_idx ON hub.messages(thread_id, id);

CREATE TABLE IF NOT EXISTS hub.message_reads (
  thread_id UUID NOT NULL REFERENCES hub.message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hub.users(id) ON DELETE CASCADE,
  last_read_message_id BIGINT NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS hub.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, label)
);

CREATE TABLE IF NOT EXISTS hub.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  -- {"all": true} or {"roles": ["driver"]} or {"driverIds": ["..."]}
  audience JSONB NOT NULL DEFAULT '{"all": true}',
  requires_ack BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_by_name TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.announcement_acks (
  announcement_id UUID NOT NULL REFERENCES hub.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hub.users(id) ON DELETE CASCADE,
  signature TEXT,  -- canvas e-sign data URL when the announcement demands it
  acked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS hub.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id),
  load_id UUID REFERENCES hub.loads(id),
  kind TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','satisfied','cancelled')),
  requested_by UUID,
  requested_by_name TEXT,
  satisfied_document_id UUID REFERENCES hub.documents(id),
  satisfied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_requests_driver_idx
  ON hub.document_requests(driver_id) WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- Spine — lanes (backhaul hints, E1) & time off (E5, blocks the planner)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hub.lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  dest_city TEXT NOT NULL,
  dest_state TEXT NOT NULL,
  loads_count INTEGER NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  miles BIGINT NOT NULL DEFAULT 0,
  margin_cents BIGINT NOT NULL DEFAULT 0,
  avg_rpm_cents INTEGER,
  last_used_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, origin_city, origin_state, dest_city, dest_state)
);

CREATE INDEX IF NOT EXISTS lanes_origin_idx ON hub.lanes(carrier_id, origin_state, origin_city);

CREATE TABLE IF NOT EXISTS hub.time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  kind TEXT NOT NULL DEFAULT 'home_time' CHECK (kind IN ('home_time','vacation','medical','other')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','denied','cancelled')),
  decided_by UUID,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS time_off_driver_idx ON hub.time_off_requests(carrier_id, driver_id, start_date);

-- ---------------------------------------------------------------------------
-- Loads: dispatch acknowledgement (Today screen / driver confirm tap)
-- ---------------------------------------------------------------------------

ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS acknowledged_by UUID;

-- ---------------------------------------------------------------------------
-- Widen polymorphic constraints for the new modules
-- ---------------------------------------------------------------------------

ALTER TABLE hub.documents DROP CONSTRAINT IF EXISTS documents_entity_type_check;
ALTER TABLE hub.documents ADD CONSTRAINT documents_entity_type_check
  CHECK (entity_type IN ('load','truck','trailer','driver','customer','incident','facility','applicant','message'));

ALTER TABLE hub.documents DROP CONSTRAINT IF EXISTS documents_kind_check;
ALTER TABLE hub.documents ADD CONSTRAINT documents_kind_check
  CHECK (kind IN (
    'rate_confirmation','bol','pod','receipt','cdl','medical_card',
    'registration','inspection','insurance','w9','agreement','other',
    'incident_photo','facility_photo','message_photo',
    'psp_report','mvr','offer_letter','drug_test','road_test'
  ));

ALTER TABLE hub.load_events DROP CONSTRAINT IF EXISTS load_events_kind_check;
ALTER TABLE hub.load_events ADD CONSTRAINT load_events_kind_check
  CHECK (kind IN (
    'status_change','check_call','geo','document','note','weather_alert',
    'detention','exception','message','task','acknowledged'
  ));
