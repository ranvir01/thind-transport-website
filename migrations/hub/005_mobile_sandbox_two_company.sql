-- HaulDesk v3 mobile sandbox + two-company launch support.
-- Additive/idempotent: production records are never wiped here.

-- Carrier/company metadata.
ALTER TABLE hub.carriers ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE hub.carriers ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE hub.carriers ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production'
  CHECK (environment IN ('production','sandbox'));
ALTER TABLE hub.carriers ADD COLUMN IF NOT EXISTS invoice_prefix TEXT;
ALTER TABLE hub.carriers ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE hub.carriers ADD COLUMN IF NOT EXISTS remit_to TEXT;

-- Data-mode marker for sandbox safety checks and targeted reset.
ALTER TABLE hub.users ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.drivers ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.trucks ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.trailers ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.customers ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.contacts ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.stops ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.documents ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.position_pings ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.crm_activities ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.load_events ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.invoices ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.payments ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.settlements ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.settlement_lines ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.advances ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.escrow_ledger ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.expenses ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.fuel_transactions ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.toll_transactions ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.compliance_items ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.maintenance_schedules ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));
ALTER TABLE hub.maintenance_records ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'production'
  CHECK (data_mode IN ('production','sandbox'));

-- Multi-company access. The user's default carrier remains hub.users.carrier_id;
-- this table controls switcher access and all-company owner views.
CREATE TABLE IF NOT EXISTS hub.user_carrier_access (
  user_id UUID NOT NULL REFERENCES hub.users(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, carrier_id)
);

-- Production company shells with only known real facts.
INSERT INTO hub.carriers (
  id, name, legal_name, display_name, dot_number, mc_number, phone, email,
  address, environment, invoice_prefix
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Thind Transport LLC',
  'Thind Transport LLC',
  'Thind',
  '2523064',
  '876103',
  '(206) 765-6300',
  'thindcarrier@gmail.com',
  'PO Box 5114, Kent, WA 98064',
  'production',
  'TT-'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  display_name = EXCLUDED.display_name,
  dot_number = EXCLUDED.dot_number,
  mc_number = EXCLUDED.mc_number,
  phone = EXCLUDED.phone,
  environment = 'production',
  invoice_prefix = COALESCE(hub.carriers.invoice_prefix, EXCLUDED.invoice_prefix);

INSERT INTO hub.carriers (
  id, name, legal_name, display_name, phone, environment, invoice_prefix
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'ATS Transport LLC',
  'ATS Transport LLC',
  'ATS',
  '(253) 410-7259',
  'production',
  'ATS-'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  display_name = EXCLUDED.display_name,
  phone = EXCLUDED.phone,
  environment = 'production',
  invoice_prefix = COALESCE(hub.carriers.invoice_prefix, EXCLUDED.invoice_prefix);

-- Keep existing Thind settings but inject known real facts and production-safe
-- two-company defaults. Unknown facts remain empty/null.
INSERT INTO hub.carrier_settings (carrier_id, settings)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '{
    "invoice": { "prefix": "ATS-", "nextNumber": 1001, "defaultTermsDays": 30 },
    "pay": { "companyDriverPerMile": 0, "ownerOperatorPercentage": 0, "payLoadedMilesOnly": true },
    "detention": { "freeHours": 2, "ratePerHourCents": 0 },
    "costPerMileCents": 0,
    "fsc": { "baseCentsPerGallon": 0, "mpg": 0 },
    "factoring": { "company": null, "remitName": null, "remitAddress": null, "email": null, "feeBps": null, "reserveBps": null },
    "notifications": { "officeEmail": null },
    "knownFacts": { "phone": "(253) 410-7259", "dot": null, "mc": null }
  }'::jsonb
) ON CONFLICT (carrier_id) DO NOTHING;

UPDATE hub.carrier_settings
SET settings = settings
  || '{"knownFacts":{"dot":"2523064","mc":"876103","phone":"(206) 765-6300"}}'::jsonb
  || '{"invoice":{"prefix":"TT-","nextNumber":1001,"defaultTermsDays":30}}'::jsonb,
  updated_at = NOW()
WHERE carrier_id = '11111111-1111-1111-1111-111111111111';

-- Sandbox carrier shells. All business rows seeded against these IDs are
-- deletable by npm run sandbox:reset without touching production IDs.
INSERT INTO hub.carriers (
  id, name, legal_name, display_name, dot_number, mc_number, phone, email,
  address, environment, invoice_prefix
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'SANDBOX Thind Transport LLC',
    'Thind Transport LLC',
    'Thind',
    '2523064',
    '876103',
    '(206) 765-6300',
    'sandbox-thind@example.invalid',
    'PO Box 5114, Kent, WA 98064',
    'sandbox',
    'SB-TT-'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'SANDBOX ATS Transport LLC',
    'ATS Transport LLC',
    'ATS',
    'SAMPLE',
    'SAMPLE',
    '(253) 410-7259',
    'sandbox-ats@example.invalid',
    'SAMPLE yard address',
    'sandbox',
    'SB-ATS-'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  display_name = EXCLUDED.display_name,
  dot_number = EXCLUDED.dot_number,
  mc_number = EXCLUDED.mc_number,
  phone = EXCLUDED.phone,
  environment = 'sandbox',
  invoice_prefix = EXCLUDED.invoice_prefix;

INSERT INTO hub.carrier_settings (carrier_id, settings)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"invoice":{"prefix":"SB-TT-","nextNumber":7001,"defaultTermsDays":30},"costPerMileCents":185,"factoring":{"company":"Cascade Sample Factoring","remitName":"Cascade Sample Factoring","remitAddress":"PO Box 1000, Seattle, WA 98101","email":"sandbox-factor@example.invalid","feeBps":300,"reserveBps":0},"notifications":{"officeEmail":"sandbox-office@example.invalid"}}'::jsonb
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '{"invoice":{"prefix":"SB-ATS-","nextNumber":3001,"defaultTermsDays":30},"costPerMileCents":190,"factoring":{"company":"Cascade Sample Factoring","remitName":"Cascade Sample Factoring","remitAddress":"PO Box 1000, Seattle, WA 98101","email":"sandbox-factor@example.invalid","feeBps":300,"reserveBps":0},"notifications":{"officeEmail":"sandbox-office@example.invalid"}}'::jsonb
  )
ON CONFLICT (carrier_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();

-- Sandbox/demo-friendly operational extensions.
ALTER TABLE hub.trucks ADD COLUMN IF NOT EXISTS current_odometer INTEGER;
ALTER TABLE hub.trucks ADD COLUMN IF NOT EXISTS eld_device_id TEXT;
ALTER TABLE hub.trucks ADD COLUMN IF NOT EXISTS fuel_card_last4 TEXT;
ALTER TABLE hub.drivers ADD COLUMN IF NOT EXISTS contractor_type TEXT NOT NULL DEFAULT 'company_driver_1099'
  CHECK (contractor_type IN ('company_driver_1099','owner_operator_1099'));

CREATE TABLE IF NOT EXISTS hub.pay_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  data_mode TEXT NOT NULL DEFAULT 'production' CHECK (data_mode IN ('production','sandbox')),
  name TEXT NOT NULL,
  contractor_type TEXT NOT NULL,
  pay_type TEXT NOT NULL CHECK (pay_type IN ('per_mile','percentage')),
  rate_bps INTEGER,
  loaded_rate_cents INTEGER,
  empty_rate_cents INTEGER,
  fsc_passthrough_bps INTEGER NOT NULL DEFAULT 0,
  plain_english TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, name)
);

ALTER TABLE hub.drivers ADD COLUMN IF NOT EXISTS pay_tariff_id UUID REFERENCES hub.pay_tariffs(id);

CREATE TABLE IF NOT EXISTS hub.revenue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  data_mode TEXT NOT NULL DEFAULT 'production' CHECK (data_mode IN ('production','sandbox')),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (carrier_id, name)
);

CREATE TABLE IF NOT EXISTS hub.debit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  data_mode TEXT NOT NULL DEFAULT 'production' CHECK (data_mode IN ('production','sandbox')),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (carrier_id, name)
);

CREATE TABLE IF NOT EXISTS hub.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID REFERENCES hub.drivers(id),
  data_mode TEXT NOT NULL DEFAULT 'production' CHECK (data_mode IN ('production','sandbox')),
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'weekly',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  data_mode TEXT NOT NULL DEFAULT 'production' CHECK (data_mode IN ('production','sandbox')),
  section TEXT NOT NULL,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'blocked' CHECK (status IN ('blocked','ready','done')),
  app_path TEXT,
  env_var TEXT,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, item_key)
);

CREATE TABLE IF NOT EXISTS hub.load_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  data_mode TEXT NOT NULL DEFAULT 'production' CHECK (data_mode IN ('production','sandbox')),
  source TEXT NOT NULL DEFAULT 'dat',
  broker_name TEXT NOT NULL,
  equipment TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  dest_city TEXT NOT NULL,
  dest_state TEXT NOT NULL,
  pickup_at TIMESTAMPTZ,
  delivery_at TIMESTAMPTZ,
  linehaul_cents INTEGER NOT NULL,
  fuel_surcharge_cents INTEGER NOT NULL DEFAULT 0,
  loaded_miles INTEGER NOT NULL,
  deadhead_miles INTEGER NOT NULL DEFAULT 0,
  score JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
