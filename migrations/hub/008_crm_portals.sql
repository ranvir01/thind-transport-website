-- Phase 5 — CRM intelligence + external portals.

-- FMCSA QCMobile vetting snapshots (free webkey; nightly re-check via cron).
CREATE TABLE IF NOT EXISTS hub.customer_vetting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  customer_id UUID NOT NULL REFERENCES hub.customers(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'fmcsa',
  allowed_to_operate BOOLEAN,
  authority_status TEXT,
  legal_name TEXT,
  snapshot JSONB,
  risk_score INTEGER,           -- 0 (walk away) … 100 (book it)
  risk_reasons JSONB NOT NULL DEFAULT '[]',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_vetting_idx ON hub.customer_vetting(customer_id, checked_at DESC);

-- Invitation-only portal accounts, scoped to one customer.
CREATE TABLE IF NOT EXISTS hub.portal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  customer_id UUID NOT NULL REFERENCES hub.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('broker','shipper')),
  token TEXT UNIQUE NOT NULL,
  invited_by_name TEXT,
  accepted_user_id UUID REFERENCES hub.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Posted truck capacity surfaced on the public load-board page.
CREATE TABLE IF NOT EXISTS hub.capacity_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  truck_id UUID REFERENCES hub.trucks(id),
  equipment TEXT NOT NULL CHECK (equipment IN ('flatbed','reefer','dry_van')),
  available_on DATE NOT NULL,
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  dest_preference TEXT,
  note TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
