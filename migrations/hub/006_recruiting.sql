-- E5 — Recruiting & driver lifecycle: ATS-lite pipeline on top of the public
-- DOT application wizard, offers with canvas e-sign, orientation gate,
-- referral bonuses paid through settlements, monthly driver scorecards.

CREATE TABLE IF NOT EXISTS hub.applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('public_site','manual','referral')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cdl_number TEXT,
  cdl_state TEXT,
  years_experience NUMERIC(4,1),
  stage TEXT NOT NULL DEFAULT 'applied' CHECK (stage IN (
    'applied','screened','mvr_psp','road_test','drug_test','offer','orientation','active','rejected'
  )),
  rejected_reason TEXT,
  notes TEXT,
  -- Raw wizard payload from the public site (PII stays in one place).
  application JSONB,
  -- Dedupe bridge to the public-site application store.
  public_application_id TEXT,
  converted_driver_id UUID REFERENCES hub.drivers(id),
  -- Orientation checklist [{key, label, done}] — gates conversion.
  orientation JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS applicants_public_bridge_idx
  ON hub.applicants(carrier_id, public_application_id) WHERE public_application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS applicants_stage_idx ON hub.applicants(carrier_id, stage);

CREATE TABLE IF NOT EXISTS hub.applicant_events (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  applicant_id UUID NOT NULL REFERENCES hub.applicants(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  note TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS applicant_events_idx ON hub.applicant_events(applicant_id, created_at);

CREATE TABLE IF NOT EXISTS hub.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  applicant_id UUID NOT NULL REFERENCES hub.applicants(id) ON DELETE CASCADE,
  pay_summary TEXT NOT NULL,
  start_date DATE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','signed','declined')),
  signature TEXT,        -- canvas e-sign data URL
  signed_name TEXT,
  signed_at TIMESTAMPTZ,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  referrer_driver_id UUID NOT NULL REFERENCES hub.drivers(id),
  applicant_id UUID NOT NULL REFERENCES hub.applicants(id) ON DELETE CASCADE,
  bonus_cents INTEGER NOT NULL DEFAULT 0,
  milestone TEXT NOT NULL DEFAULT 'hired' CHECK (milestone IN ('hired','days_90')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','payable','paid','void')),
  paid_settlement_id UUID REFERENCES hub.settlements(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referrals_payable_idx
  ON hub.referrals(carrier_id, referrer_driver_id) WHERE status = 'payable';

-- Monthly computed scorecards feeding reviews and scorecard_bonus pay rules.
CREATE TABLE IF NOT EXISTS hub.driver_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id) ON DELETE CASCADE,
  month DATE NOT NULL,  -- first of month
  on_time_pct NUMERIC(5,1),
  mpg NUMERIC(6,2),
  fleet_mpg NUMERIC(6,2),
  incidents INTEGER NOT NULL DEFAULT 0,
  loads_delivered INTEGER NOT NULL DEFAULT 0,
  composite NUMERIC(5,1) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, driver_id, month)
);
