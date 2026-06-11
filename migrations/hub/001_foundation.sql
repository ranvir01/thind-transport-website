-- Thind Transport Hub — Phase 1 foundation schema.
-- All Hub tables live in the dedicated "hub" schema so they can never collide
-- with the public website's tables (drivers, applications, public_applications).

CREATE SCHEMA IF NOT EXISTS hub;

CREATE TABLE IF NOT EXISTS hub.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','dispatcher','accountant','driver','broker','shipper')),
  phone TEXT,
  customer_id UUID,
  driver_id UUID,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES hub.users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cdl_number TEXT,
  cdl_state TEXT,
  cdl_expiry DATE,
  medical_card_expiry DATE,
  hire_date DATE,
  pay_type TEXT NOT NULL DEFAULT 'per_mile' CHECK (pay_type IN ('per_mile','percentage')),
  pay_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','applicant')),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hub.trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number TEXT UNIQUE NOT NULL,
  vin TEXT,
  plate TEXT,
  plate_state TEXT,
  year INT,
  make TEXT,
  model TEXT,
  ownership TEXT NOT NULL DEFAULT 'company' CHECK (ownership IN ('company','owner_operator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','shop','idle','retired')),
  registration_expiry DATE,
  inspection_due DATE,
  insurance_expiry DATE,
  assigned_driver_id UUID REFERENCES hub.drivers(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hub.trailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number TEXT UNIQUE NOT NULL,
  vin TEXT,
  plate TEXT,
  plate_state TEXT,
  year INT,
  make TEXT,
  type TEXT NOT NULL DEFAULT 'dry_van' CHECK (type IN ('flatbed','reefer','dry_van')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','shop','idle','retired')),
  registration_expiry DATE,
  inspection_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hub.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'broker' CHECK (type IN ('broker','shipper')),
  mc_number TEXT,
  dot_number TEXT,
  billing_email TEXT,
  billing_address TEXT,
  phone TEXT,
  payment_terms_days INT NOT NULL DEFAULT 30,
  credit_limit NUMERIC(12,2),
  factored BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','blacklisted')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hub.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES hub.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hub.users
  ADD CONSTRAINT users_customer_fk FOREIGN KEY (customer_id) REFERENCES hub.customers(id);
ALTER TABLE hub.users
  ADD CONSTRAINT users_driver_fk FOREIGN KEY (driver_id) REFERENCES hub.drivers(id);

CREATE TABLE IF NOT EXISTS hub.loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  customer_reference TEXT,
  customer_id UUID REFERENCES hub.customers(id),
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN (
    'quoted','booked','dispatched','at_pickup','in_transit','delivered',
    'pod_received','invoiced','paid','settled','cancelled'
  )),
  equipment TEXT NOT NULL DEFAULT 'dry_van' CHECK (equipment IN ('flatbed','reefer','dry_van')),
  commodity TEXT,
  weight_lbs INT,
  linehaul NUMERIC(12,2) NOT NULL DEFAULT 0,
  fuel_surcharge NUMERIC(12,2) NOT NULL DEFAULT 0,
  accessorials JSONB NOT NULL DEFAULT '[]',
  loaded_miles INT,
  deadhead_miles INT,
  truck_id UUID REFERENCES hub.trucks(id),
  trailer_id UUID REFERENCES hub.trailers(id),
  driver_id UUID REFERENCES hub.drivers(id),
  dispatcher_id UUID REFERENCES hub.users(id),
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('dat','direct','import')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS loads_status_idx ON hub.loads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS loads_customer_idx ON hub.loads(customer_id);

CREATE TABLE IF NOT EXISTS hub.stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES hub.loads(id) ON DELETE CASCADE,
  sequence INT NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK (type IN ('pickup','delivery')),
  facility TEXT,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  appt_start TIMESTAMPTZ,
  appt_end TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stops_load_idx ON hub.stops(load_id, sequence);

CREATE TABLE IF NOT EXISTS hub.load_status_events (
  id BIGSERIAL PRIMARY KEY,
  load_id UUID NOT NULL REFERENCES hub.loads(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS load_status_events_load_idx ON hub.load_status_events(load_id);

CREATE TABLE IF NOT EXISTS hub.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('load','truck','trailer','driver','customer')),
  entity_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'rate_confirmation','bol','pod','receipt','cdl','medical_card',
    'registration','inspection','insurance','w9','agreement','other'
  )),
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INT,
  storage TEXT NOT NULL DEFAULT 'local' CHECK (storage IN ('local','blob')),
  url TEXT NOT NULL,
  expiry DATE,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_entity_idx ON hub.documents(entity_type, entity_id);

-- IFTA-grade position store (append-only, four-year retention).
CREATE TABLE IF NOT EXISTS hub.position_pings (
  id BIGSERIAL PRIMARY KEY,
  truck_id UUID NOT NULL REFERENCES hub.trucks(id),
  ts TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  odometer NUMERIC(10,1),
  source TEXT NOT NULL DEFAULT 'import',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS position_pings_truck_ts_idx ON hub.position_pings(truck_id, ts DESC);

CREATE TABLE IF NOT EXISTS hub.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES hub.customers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES hub.contacts(id),
  load_id UUID REFERENCES hub.loads(id),
  kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note','call','email')),
  body TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  actor_name TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON hub.audit_log(entity_type, entity_id);
